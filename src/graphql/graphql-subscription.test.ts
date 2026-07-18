// @vitest-environment node
import { invariant } from 'outvariant'
import { OperationTypeNode, parse } from 'graphql'
import { getSiblingHandlers } from '#core/utils/internal/attachSiblingHandlers'
import { HttpHandler } from '#http/http-handler'
import { WebSocketHandler } from '#core/handlers/WebSocketHandler'
import { WebSocketNetworkFrame } from '#core/experimental/frames/websocket-frame'
import { InMemoryHandlersController } from '#core/experimental/handlers-controller'
import { createTestWebSocketConnection } from '../../test/support/ws-test-utils'
import type { GraphQLHandlerInfo } from './graphql-handler'
import { graphql } from './graphql'
import {
  createGraphQLSubscriptionHandler,
  GraphQLSubscriptionTransportHandler,
} from './graphql-subscription'

const subscription = createGraphQLSubscriptionHandler(
  'http://localhost:4000/graphql',
)

describe('info', () => {
  it('resolves handler info for a string operation name', () => {
    expect(
      subscription('OnCommentAdded', () => {}).info,
    ).toEqual<GraphQLHandlerInfo>({
      header:
        'subscription OnCommentAdded (origin: ws://localhost:4000/graphql)',
      operationName: 'OnCommentAdded',
      operationType: OperationTypeNode.SUBSCRIPTION,
    })
  })

  it('resolves handler info for a RegExp operation name', () => {
    expect(subscription(/Comment/, () => {}).info).toEqual<GraphQLHandlerInfo>({
      header: 'subscription /Comment/ (origin: ws://localhost:4000/graphql)',
      operationName: /Comment/,
      operationType: OperationTypeNode.SUBSCRIPTION,
    })
  })

  it('resolves handler info for a DocumentNode operation name', () => {
    const node = parse(`
      subscription OnCommentAdded {
        comment {
          id
        }
      }
    `)

    expect(subscription(node, () => {}).info).toEqual<GraphQLHandlerInfo>({
      header:
        'subscription OnCommentAdded (origin: ws://localhost:4000/graphql)',
      operationName: 'OnCommentAdded',
      operationType: OperationTypeNode.SUBSCRIPTION,
    })
  })
})

describe('predicate', () => {
  it('returns true for a matching WebSocket connection url', () => {
    const handler = subscription('OnCommentAdded', () => {})
    const url = 'ws://localhost:4000/graphql'
    const parsedResult = handler.parse({ url })

    expect(handler.predicate({ url, parsedResult })).toBe(true)
  })

  it('returns false for a non-matching WebSocket connection url', () => {
    const handler = subscription('OnCommentAdded', () => {})
    const url = 'ws://example.com/chat'
    const parsedResult = handler.parse({ url })

    expect(handler.predicate({ url, parsedResult })).toBe(false)
  })
})

describe('subprotocol discrimination', () => {
  class TestWebSocketFrame extends WebSocketNetworkFrame {
    public passthrough = vi.fn()
    public errorWith = vi.fn()
  }

  function getWebSocketHandlers(
    controller: InMemoryHandlersController,
  ): Array<WebSocketHandler> {
    return controller
      .getHandlersByKind('websocket')
      .filter((handler) => handler instanceof WebSocketHandler)
  }

  it('does not claim connections that lack the "graphql-transport-ws" subprotocol', async () => {
    const api = graphql.link('*')
    const controller = new InMemoryHandlersController([
      api.subscription('OnCommentAdded', vi.fn()),
      api.operation(vi.fn()),
    ])

    // A non-GraphQL WebSocket connection (e.g. HMR, chat) that happens
    // to match the wildcard endpoint. It must stay unhandled so it
    // performs the connection as-is.
    const connection = createTestWebSocketConnection('ws://localhost/socket')
    const frame = new TestWebSocketFrame({ connection })
    const unhandledFrameCallback = vi.fn()

    const matches = await frame.resolve(
      getWebSocketHandlers(controller),
      unhandledFrameCallback,
      { quiet: true },
    )

    expect.soft(matches).toBe(false)
    expect.soft(frame.passthrough).toHaveBeenCalledOnce()
    expect.soft(frame.errorWith).not.toHaveBeenCalled()
    expect
      .soft(unhandledFrameCallback)
      .toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ frame }))
  })

  it('claims connections that request the "graphql-transport-ws" subprotocol', async () => {
    const api = graphql.link('*')
    const controller = new InMemoryHandlersController([
      api.subscription('OnCommentAdded', vi.fn()),
    ])

    const connection = createTestWebSocketConnection('ws://localhost/graphql', {
      protocols: ['graphql-transport-ws'],
    })
    const frame = new TestWebSocketFrame({ connection })
    const unhandledFrameCallback = vi.fn()

    const matches = await frame.resolve(
      getWebSocketHandlers(controller),
      unhandledFrameCallback,
      { quiet: true },
    )

    expect.soft(matches).toBe(true)
    expect.soft(frame.passthrough).not.toHaveBeenCalled()
    expect.soft(frame.errorWith).not.toHaveBeenCalled()
    expect.soft(unhandledFrameCallback).not.toHaveBeenCalled()
  })

  it('ignores upgrade requests that lack the "graphql-transport-ws" subprotocol', async () => {
    const handler = subscription('OnCommentAdded', () => {})
    const [, upgradeHandler] = getSiblingHandlers(handler)

    invariant(
      upgradeHandler instanceof HttpHandler,
      'Expected the second sibling to be the upgrade request handler',
    )

    await expect(
      upgradeHandler.run({
        request: new Request('http://localhost:4000/graphql', {
          headers: {
            upgrade: 'websocket',
            'sec-websocket-key': 'dGhlIHNhbXBsZSBub25jZQ==',
          },
        }),
        requestId: 'upgrade-plain',
      }),
    ).resolves.toBeNull()
  })

  it('confirms the subprotocol for matching upgrade requests', async () => {
    const handler = subscription('OnCommentAdded', () => {})
    const [, upgradeHandler] = getSiblingHandlers(handler)

    invariant(
      upgradeHandler instanceof HttpHandler,
      'Expected the second sibling to be the upgrade request handler',
    )

    const result = await upgradeHandler.run({
      request: new Request('http://localhost:4000/graphql', {
        headers: {
          upgrade: 'websocket',
          'sec-websocket-key': 'dGhlIHNhbXBsZSBub25jZQ==',
          'sec-websocket-protocol': 'graphql-transport-ws',
        },
      }),
      requestId: 'upgrade-graphql',
    })

    expect(result?.response?.status).toBe(101)
    expect(result?.response?.headers.get('sec-websocket-protocol')).toBe(
      'graphql-transport-ws',
    )
  })
})

describe('sibling handlers', () => {
  it('shares the transport and upgrade handlers between subscription handlers', () => {
    const firstHandler = subscription('OnCommentAdded', () => {})
    const secondHandler = subscription('OnPostAdded', () => {})

    const firstSiblings = getSiblingHandlers(firstHandler)
    const secondSiblings = getSiblingHandlers(secondHandler)

    expect(firstSiblings).toHaveLength(2)
    expect(firstSiblings[0]).toBeInstanceOf(GraphQLSubscriptionTransportHandler)

    // The transport and the upgrade handlers must be shared by reference
    // so the handlers controller dedupes them across subscription handlers.
    expect(secondSiblings[0]).toBe(firstSiblings[0])
    expect(secondSiblings[1]).toBe(firstSiblings[1])
  })
})

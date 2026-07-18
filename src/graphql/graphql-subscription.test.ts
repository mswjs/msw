// @vitest-environment node
import { OperationTypeNode, parse } from 'graphql'
import { getSiblingHandlers } from '#core/utils/internal/attachSiblingHandlers'
import type { GraphQLHandlerInfo } from './graphql-handler'
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

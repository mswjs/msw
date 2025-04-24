// @vitest-environment node
import { OperationTypeNode, parse } from 'graphql'
import type { WebSocketConnectionData } from '@mswjs/interceptors/WebSocket'
import type { GraphQLHandlerInfo } from './GraphQLHandler'
import {
  GraphQLInternalPubsub,
  GraphQLSubscriptionHandler,
} from './GraphQLSubscriptionHandler'

const pubsub = new GraphQLInternalPubsub('ws://localhost:4000/graphql')

describe('info', () => {
  it('resolves handler info for a string operation name', () => {
    expect(
      new GraphQLSubscriptionHandler('OnCommendAdded', pubsub, () => {}).info,
    ).toEqual<GraphQLHandlerInfo>({
      header:
        'subscription OnCommendAdded (origin: ws://localhost:4000/graphql)',
      operationName: 'OnCommendAdded',
      operationType: OperationTypeNode.SUBSCRIPTION,
    })
  })

  it('resolves handler info for a RegExp operation name', () => {
    expect(
      new GraphQLSubscriptionHandler(/Comment/, pubsub, () => {}).info,
    ).toEqual<GraphQLHandlerInfo>({
      header: 'subscription /Comment/ (origin: ws://localhost:4000/graphql)',
      operationName: /Comment/,
      operationType: OperationTypeNode.SUBSCRIPTION,
    })
  })

  it('resolves handler info for a DocumentNode operation name', () => {
    const node = parse(`
			subscription OnCommendAdded {
				commend {
					id
				}
			}
		`)

    expect(
      new GraphQLSubscriptionHandler(node, pubsub, () => {}).info,
    ).toEqual<GraphQLHandlerInfo>({
      header:
        'subscription OnCommendAdded (origin: ws://localhost:4000/graphql)',
      operationName: 'OnCommendAdded',
      operationType: OperationTypeNode.SUBSCRIPTION,
    })
  })
})

describe('predicate', () => {
  it('returns true for a matching WebSocket connection', () => {
    const handler = new GraphQLSubscriptionHandler(
      'OnCommendAdded',
      pubsub,
      () => {},
    )

    const event = new MessageEvent<WebSocketConnectionData>('connection', {
      data: {
        client: {
          url: new URL('ws://localhost:4000/graphql'),
        },
      } as WebSocketConnectionData,
    })

    expect(
      handler.predicate({
        event,
        parsedResult: handler.parse({ event }),
      }),
    ).toBe(true)
  })

  it('returns false for a non-matching WebSocket connection', () => {
    const handler = new GraphQLSubscriptionHandler(
      'OnCommendAdded',
      pubsub,
      () => {},
    )

    const event = new MessageEvent<WebSocketConnectionData>('connection', {
      data: {
        client: {
          url: new URL('ws://example.com/chat'),
        },
      } as WebSocketConnectionData,
    })

    expect(
      handler.predicate({
        event,
        parsedResult: handler.parse({ event }),
      }),
    ).toBe(false)
  })
})

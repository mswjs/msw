// @vitest-environment node
import { OperationTypeNode, parse } from 'graphql'
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

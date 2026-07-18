// @vitest-environment node
import { HttpResponse, type PathParams } from 'msw'
import { setupServer } from 'msw/node'
import {
  graphql,
  type GraphQLSubscription,
  type GraphQLSubscriptionResolver,
} from 'msw/graphql'
import { createPubSub, createSchema } from 'graphql-yoga'
import { createClient } from '../../support/graphqlClient'
import { gql } from '../../support/graphql'
import { createTestGraphQLServer } from '../../support/graphqlServer'

const server = setupServer()

beforeAll(() => {
  server.listen()
})

afterEach(() => {
  server.resetHandlers()
  server.events.removeAllListeners()
  vi.restoreAllMocks()
})

afterAll(() => {
  server.close()
})

it('intercepts and mocks a GraphQL subscription', async () => {
  const api = graphql.link('http://localhost:4000/graphql')

  server.use(
    api.subscription('OnCommentAdded', ({ subscription }) => {
      subscription.publish({
        data: {
          commentAdded: {
            id: '1',
            text: 'Hello world',
          },
        },
      })
    }),
  )

  await using client = createClient({
    url: 'ws://localhost:4000/graphql',
  })
  const subscription = client.iterate({
    query: gql`
      subscription OnCommentAdded {
        commentAdded {
          id
          text
        }
      }
    `,
  })

  await expect(subscription.next()).resolves.toEqual({
    done: false,
    value: {
      data: {
        commentAdded: {
          id: '1',
          text: 'Hello world',
        },
      },
    },
  })
})

it('marks a subscription as complete', async () => {
  const api = graphql.link('http://localhost:4000/graphql')

  server.use(
    api.subscription('OnCommentAdded', ({ subscription }) => {
      queueMicrotask(() => {
        subscription.complete()
      })
    }),
  )

  await using client = createClient({
    url: 'ws://localhost:4000/graphql',
  })
  const subscription = client.iterate({
    query: gql`
      subscription OnCommentAdded {
        commentAdded {
          text
        }
      }
    `,
  })

  await expect(subscription.next()).resolves.toEqual({
    done: true,
    value: undefined,
  })
})

it('terminates a subscription with errors', async () => {
  const api = graphql.link('http://localhost:4000/graphql')

  server.use(
    api.subscription('OnCommentAdded', ({ subscription }) => {
      queueMicrotask(() => {
        subscription.error([{ message: 'Something went wrong' }])
      })
    }),
  )

  await using client = createClient({
    url: 'ws://localhost:4000/graphql',
  })
  const subscription = client.iterate({
    query: gql`
      subscription OnCommentAdded {
        commentAdded {
          text
        }
      }
    `,
  })

  await expect(subscription.next()).rejects.toEqual([
    expect.objectContaining({ message: 'Something went wrong' }),
  ])
})

it('exposes path parameters from the WebSocket link', async () => {
  const paramsPromise = Promise.withResolvers<PathParams>()
  const api = graphql.link('https://localhost/:service')

  server.use(
    api.subscription('OnCommentAdded', ({ params, subscription }) => {
      paramsPromise.resolve(params)
      subscription.complete()
    }),
  )

  await using client = createClient({
    url: 'wss://localhost/user-service',
  })
  const subscription = client.iterate({
    query: gql`
      subscription OnCommentAdded {
        commentAdded {
          text
        }
      }
    `,
  })

  await subscription.next()

  await expect(paramsPromise.promise).resolves.toEqual({
    service: 'user-service',
  })
})

it('scopes published data to the subscribed client', async () => {
  const api = graphql.link('http://localhost:4000/graphql')

  server.use(
    api.subscription<{ greeting: string }, { name: string }>(
      'OnGreeting',
      ({ subscription }) => {
        subscription.publish({
          data: {
            greeting: `hello, ${subscription.variables.name}`,
          },
        })
        queueMicrotask(() => {
          subscription.complete()
        })
      },
    ),
  )

  const query = gql`
    subscription OnGreeting($name: String!) {
      greeting(name: $name)
    }
  `

  async function collectMessages(name: string): Promise<Array<unknown>> {
    await using client = createClient({ url: 'ws://localhost:4000/graphql' })
    const messages: Array<unknown> = []

    for await (const result of client.iterate({
      query,
      variables: { name },
    })) {
      messages.push(result)
    }

    return messages
  }

  await expect(collectMessages('john')).resolves.toEqual([
    { data: { greeting: 'hello, john' } },
  ])
  await expect(collectMessages('kate')).resolves.toEqual([
    { data: { greeting: 'hello, kate' } },
  ])
})

it('respects handler overrides for the same operation', async () => {
  const api = graphql.link('http://localhost:4000/graphql')
  const initialResolver = vi.fn()

  server.use(api.subscription('OnCommentAdded', initialResolver))
  server.use(
    api.subscription('OnCommentAdded', ({ subscription }) => {
      subscription.publish({
        data: {
          commentAdded: { text: 'override' },
        },
      })
    }),
  )

  await using client = createClient({
    url: 'ws://localhost:4000/graphql',
  })
  const subscription = client.iterate({
    query: gql`
      subscription OnCommentAdded {
        commentAdded {
          text
        }
      }
    `,
  })

  await expect(subscription.next()).resolves.toEqual({
    done: false,
    value: {
      data: {
        commentAdded: { text: 'override' },
      },
    },
  })

  expect(initialResolver).not.toHaveBeenCalled()
})

it('matches an outgoing subscription with "graphql.operation()"', async () => {
  const operationResolver = vi.fn()

  const api = graphql.link('https://localhost/graphql')
  server.use(api.operation(operationResolver))

  await using client = createClient({
    url: 'wss://localhost/graphql',
  })
  client.iterate({
    query: gql`
      subscription OnCommentAdded($postId: ID!) {
        commentAdded(postId: $postId) {
          text
        }
      }
    `,
    variables: { postId: 'post-1' },
  })

  await expect
    .poll(() => operationResolver)
    .toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({
        operationName: 'OnCommentAdded',
        query: expect.stringContaining('subscription OnCommentAdded'),
        variables: { postId: 'post-1' },
      }),
    )

  // The resolver must receive the full resolver contract, not a
  // reduced object that only looks like one to TypeScript.
  const [info] = operationResolver.mock.calls[0]
  expect(info.request).toBeInstanceOf(Request)
  expect(info.request.url).toBe('wss://localhost/graphql')
  expect(info.request.headers.get('upgrade')).toBe('websocket')
  expect(info.requestId).toEqual(expect.any(String))
  expect(info.cookies).toEqual({})
  expect(info.finalize).toBeInstanceOf(Function)
})

it('supports one-time "graphql.operation()" handlers', async () => {
  vi.spyOn(console, 'warn').mockImplementation(() => {})

  const operationResolver = vi.fn()
  const api = graphql.link('http://localhost:4000/graphql')
  server.use(api.operation(operationResolver, { once: true }))

  await using client = createClient({
    url: 'ws://localhost:4000/graphql',
    lazy: false,
  })
  const query = gql`
    subscription OnCommentAdded {
      commentAdded {
        text
      }
    }
  `

  client.iterate({ query }).next()
  await expect.poll(() => operationResolver).toHaveBeenCalledOnce()

  // The second subscription must not match the used handler.
  client.iterate({ query }).next()
  await expect
    .poll(() => vi.mocked(console.warn).mock.calls.flat().join('\n'))
    .toMatch(/no matching subscription handler/)

  expect(operationResolver).toHaveBeenCalledOnce()
})

it('supports one-time subscription handlers', async () => {
  vi.spyOn(console, 'warn').mockImplementation(() => {})

  const api = graphql.link('http://localhost:4000/graphql')
  const resolver = vi.fn<GraphQLSubscriptionResolver>(({ subscription }) => {
    subscription.publish({
      data: { commentAdded: { text: 'first' } },
    })
  })

  server.use(api.subscription('OnCommentAdded', resolver, { once: true }))

  await using client = createClient({
    url: 'ws://localhost:4000/graphql',
  })
  const query = gql`
    subscription OnCommentAdded {
      commentAdded {
        text
      }
    }
  `

  const firstSubscription = client.iterate({ query })
  await expect(firstSubscription.next()).resolves.toEqual({
    done: false,
    value: {
      data: { commentAdded: { text: 'first' } },
    },
  })

  // The second subscription must not match the used handler.
  const secondSubscription = client.iterate({ query })
  const secondNext = secondSubscription.next()

  await expect
    .poll(() => vi.mocked(console.warn).mock.calls.flat().join('\n'))
    .toMatch(/no matching subscription handler/)

  expect(resolver).toHaveBeenCalledTimes(1)

  secondNext.catch(() => {})
})

it('warns on a subscription without a matching handler', async () => {
  vi.spyOn(console, 'warn').mockImplementation(() => {})

  const api = graphql.link('http://localhost:4000/graphql')
  server.use(api.subscription('OnCommentAdded', () => {}))

  await using client = createClient({
    url: 'ws://localhost:4000/graphql',
  })
  const subscription = client.iterate({
    query: gql`
      subscription OnPostAdded {
        postAdded {
          id
        }
      }
    `,
  })
  const pendingNext = subscription.next()

  await expect
    .poll(() => vi.mocked(console.warn).mock.calls.flat().join('\n'))
    .toMatch(
      /Intercepted a GraphQL subscription "OnPostAdded" to "ws:\/\/localhost:4000\/graphql" that has no matching subscription handler/,
    )

  pendingNext.catch(() => {})
})

it('warns when publishing to a subscription after the handlers were reset', async () => {
  vi.spyOn(console, 'warn').mockImplementation(() => {})

  const api = graphql.link('http://localhost:4000/graphql')
  const subscriptionPromise = Promise.withResolvers<GraphQLSubscription>()

  server.use(
    api.subscription('OnCommentAdded', ({ subscription }) => {
      subscriptionPromise.resolve(subscription)
    }),
  )

  await using client = createClient({
    url: 'ws://localhost:4000/graphql',
  })
  const subscription = client.iterate({
    query: gql`
      subscription OnCommentAdded {
        commentAdded {
          text
        }
      }
    `,
  })
  const pendingNext = subscription.next()

  const interceptedSubscription = await subscriptionPromise.promise
  server.resetHandlers()

  // Publishing to a stale subscription must be a warning no-op
  // instead of writing to the (possibly unrelated) socket.
  interceptedSubscription.publish({
    data: { commentAdded: { text: 'stale' } },
  })

  expect(console.warn).toHaveBeenCalledWith(
    expect.stringMatching(
      /Failed to publish to the GraphQL subscription ".+": the subscription is no longer active/,
    ),
  )

  pendingNext.catch(() => {})
})

it('responds to the protocol ping messages', async () => {
  const api = graphql.link('http://localhost:4000/graphql')
  server.use(api.subscription('OnCommentAdded', () => {}))

  const socket = new WebSocket('ws://localhost:4000/graphql', [
    'graphql-transport-ws',
  ])
  const messages: Array<{ type: string }> = []
  const pongPromise = Promise.withResolvers<void>()

  socket.onopen = () => {
    socket.send(JSON.stringify({ type: 'connection_init' }))
  }
  socket.onmessage = (event) => {
    const message = JSON.parse(String(event.data))
    messages.push(message)

    if (message.type === 'connection_ack') {
      socket.send(JSON.stringify({ type: 'ping' }))
    }

    if (message.type === 'pong') {
      pongPromise.resolve()
    }
  }

  await pongPromise.promise

  expect(messages).toEqual([{ type: 'connection_ack' }, { type: 'pong' }])
  socket.close()
})

it('acknowledges the connection once when multiple links share the endpoint', async () => {
  // Two `graphql.link()` calls to the same endpoint create two subscription
  // transports, both matching this connection. They must share a single
  // protocol session, otherwise each of them binds its own listeners and
  // answers every client frame, duplicating the server messages.
  const firstApi = graphql.link('http://localhost:4000/graphql')
  const secondApi = graphql.link('http://localhost:4000/graphql')

  server.use(
    firstApi.subscription('OnCommentAdded', () => {}),
    secondApi.subscription('OnCommentAdded', () => {}),
  )

  const socket = new WebSocket('ws://localhost:4000/graphql', [
    'graphql-transport-ws',
  ])
  const messages: Array<{ type: string }> = []
  const pongPromise = Promise.withResolvers<void>()

  socket.onopen = () => {
    socket.send(JSON.stringify({ type: 'connection_init' }))
  }
  socket.onmessage = (event) => {
    const message = JSON.parse(String(event.data))
    messages.push(message)

    if (message.type === 'connection_ack') {
      socket.send(JSON.stringify({ type: 'ping' }))
    }

    if (message.type === 'pong') {
      pongPromise.resolve()
    }
  }

  await pongPromise.promise

  // Await a tick past the first "pong" so any duplicate frames the
  // transports may send for the same client are captured as well.
  await new Promise((resolve) => setTimeout(resolve, 100))

  expect(messages).toEqual([{ type: 'connection_ack' }, { type: 'pong' }])
  socket.close()
})

it('resolves a subscription once when multiple links share the endpoint', async () => {
  const firstResolver = vi.fn<GraphQLSubscriptionResolver>(
    ({ subscription }) => {
      subscription.publish({
        data: { commentAdded: { text: 'first' } },
      })
    },
  )
  const secondResolver = vi.fn<GraphQLSubscriptionResolver>()

  const firstApi = graphql.link('http://localhost:4000/graphql')
  const secondApi = graphql.link('http://localhost:4000/graphql')

  server.use(
    firstApi.subscription('OnCommentAdded', firstResolver),
    secondApi.subscription('OnCommentAdded', secondResolver),
  )

  await using client = createClient({
    url: 'ws://localhost:4000/graphql',
  })
  const subscription = client.iterate({
    query: gql`
      subscription OnCommentAdded {
        commentAdded {
          text
        }
      }
    `,
  })

  await expect(subscription.next()).resolves.toEqual({
    done: false,
    value: {
      data: { commentAdded: { text: 'first' } },
    },
  })

  // The subscription must be dispatched to the subscribers in the handler
  // resolution order, and stop at the first one that matches. Sharing the
  // endpoint between links must not resolve it once per transport.
  expect(firstResolver).toHaveBeenCalledTimes(1)
  expect(secondResolver).not.toHaveBeenCalled()
})

it('subscribes to extraneous pubsubs', async () => {
  const pubsub = createPubSub<{
    commentAdded: [{ commentAdded: { text: string } }]
  }>()
  const subscriptionAddedPromise = Promise.withResolvers<void>()

  server.events.on('graphql:subscription', ({ operationName }) => {
    if (operationName === 'OnCommentAdded') {
      subscriptionAddedPromise.resolve()
    }
  })

  const api = graphql.link('https://localhost/graphql')
  server.use(
    api.subscription('OnCommentAdded', ({ subscription }) => {
      subscription.from(pubsub.subscribe('commentAdded'))
    }),
    api.mutation('AddComment', ({ variables }) => {
      const { comment } = variables

      pubsub.publish('commentAdded', {
        commentAdded: comment,
      })

      return HttpResponse.json({
        data: { comment },
      })
    }),
  )

  await using client = createClient({
    url: 'wss://localhost/graphql',
  })
  const subscription = client.iterate({
    query: gql`
      subscription OnCommentAdded {
        commentAdded {
          text
        }
      }
    `,
  })

  // Await the subscription to be established before publishing to the
  // pubsub. Unlike the client, the pubsub does not replay events published
  // before the subscription became active (the mutation below may otherwise
  // outrace the WebSocket handshake, e.g. on Node.js 24).
  await subscriptionAddedPromise.promise

  const comment = { text: 'hello world' }
  await fetch('https://localhost/graphql', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      query: gql`
        mutation AddComment($comment: CommentInput!) {
          comment {
            text
          }
        }
      `,
      variables: { comment },
    }),
  })

  await expect(subscription.next()).resolves.toEqual({
    done: false,
    value: {
      data: {
        commentAdded: comment,
      },
    },
  })
})

it('emits the "graphql:subscription" life-cycle event when a subscription is established', async () => {
  const subscriptionEventPromise = Promise.withResolvers<{
    operationName: string
    query: string
    variables: Record<string, unknown>
    request: Request
  }>()

  server.events.on('graphql:subscription', (event) => {
    subscriptionEventPromise.resolve(event)
  })

  const api = graphql.link('https://localhost/graphql')
  server.use(api.subscription('OnCommentAdded', () => {}))

  await using client = createClient({
    url: 'wss://localhost/graphql',
  })
  const subscription = client.iterate({
    query: gql`
      subscription OnCommentAdded($postId: ID!) {
        commentAdded(postId: $postId) {
          text
        }
      }
    `,
    variables: { postId: 'post-1' },
  })
  const pendingNext = subscription.next()

  const subscriptionEvent = await subscriptionEventPromise.promise

  expect(subscriptionEvent.operationName).toBe('OnCommentAdded')
  expect(subscriptionEvent.query).toContain('subscription OnCommentAdded')
  expect(subscriptionEvent.variables).toEqual({ postId: 'post-1' })
  expect(subscriptionEvent.request).toBeInstanceOf(Request)
  expect(subscriptionEvent.request.url).toBe('wss://localhost/graphql')
  expect(subscriptionEvent.request.headers.get('connection')).toBe('upgrade')
  expect(subscriptionEvent.request.headers.get('upgrade')).toBe('websocket')

  pendingNext.catch(() => {})
})

it('does not emit the "graphql:subscription" life-cycle event for unhandled subscriptions', async () => {
  vi.spyOn(console, 'warn').mockImplementation(() => {})

  const subscriptionListener = vi.fn()
  server.events.on('graphql:subscription', subscriptionListener)

  const api = graphql.link('https://localhost/graphql')
  server.use(api.subscription('OnCommentAdded', () => {}))

  await using client = createClient({
    url: 'wss://localhost/graphql',
  })
  const subscription = client.iterate({
    query: gql`
      subscription OnPostAdded {
        postAdded {
          id
        }
      }
    `,
  })
  const pendingNext = subscription.next()

  // The unhandled subscription warning marks the dispatch completion.
  await expect
    .poll(() => vi.mocked(console.warn).mock.calls.flat().join('\n'))
    .toMatch(/no matching subscription handler/)

  expect(subscriptionListener).not.toHaveBeenCalled()

  pendingNext.catch(() => {})
})

it('combines extraneous and default pubsubs', async () => {
  const pubsub = createPubSub<{
    commentAdded: [{ commentAdded: { text: string } }]
  }>()

  const api = graphql.link('https://localhost/graphql')
  server.use(
    api.subscription('OnCommentAdded', ({ subscription }) => {
      subscription.publish({
        data: {
          commentAdded: {
            text: 'manual comment',
          },
        },
      })

      subscription.from(pubsub.subscribe('commentAdded'))
    }),
    api.mutation('AddComment', ({ variables }) => {
      const { comment } = variables

      pubsub.publish('commentAdded', { commentAdded: comment })

      return HttpResponse.json({
        data: { comment },
      })
    }),
  )

  await using client = createClient({
    url: 'wss://localhost/graphql',
  })
  const subscription = client.iterate({
    query: gql`
      subscription OnCommentAdded {
        commentAdded {
          text
        }
      }
    `,
  })

  // First, must receive the payload from the manual publish.
  await expect(subscription.next()).resolves.toEqual({
    done: false,
    value: {
      data: {
        commentAdded: { text: 'manual comment' },
      },
    },
  })

  const comment = { text: 'comment from mutation' }
  await fetch('https://localhost/graphql', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      query: gql`
        mutation AddComment($comment: CommentInput!) {
          comment {
            text
          }
        }
      `,
      variables: { comment },
    }),
  })

  // Then, must receive the publish from the mutation.
  await expect(subscription.next()).resolves.toEqual({
    done: false,
    value: {
      data: {
        commentAdded: comment,
      },
    },
  })
})

it('selects the operation by name in a multi-operation document', async () => {
  const api = graphql.link('http://localhost:4000/graphql')

  server.use(
    api.subscription('OnCommentAdded', ({ subscription }) => {
      subscription.publish({
        data: { commentAdded: { text: 'Hello world' } },
      })
    }),
  )

  await using client = createClient({
    url: 'ws://localhost:4000/graphql',
  })
  const subscription = client.iterate({
    // A document bundle where the subscription is not the first operation.
    query: gql`
      query GetComments {
        comments {
          text
        }
      }

      subscription OnCommentAdded {
        commentAdded {
          text
        }
      }
    `,
    operationName: 'OnCommentAdded',
  })

  await expect(subscription.next()).resolves.toEqual({
    done: false,
    value: {
      data: { commentAdded: { text: 'Hello world' } },
    },
  })
})

it('replays the connection params to the original server', async () => {
  const connectionParamsListener = vi.fn()

  await using testServer = await createTestGraphQLServer({
    onConnect: connectionParamsListener,
    schema: createSchema({
      typeDefs: gql`
        type Comment {
          text: String!
        }

        type Query {
          comments: [Comment!]!
        }

        type Subscription {
          commentAdded: Comment!
        }
      `,
      resolvers: {
        Subscription: {
          commentAdded: {
            async *subscribe() {
              yield { commentAdded: { text: 'hello world' } }
            },
          },
        },
      },
    }),
  })

  const api = graphql.link(testServer.http.url().href)
  server.use(
    api.subscription('OnCommentAdded', ({ subscription }) => {
      subscription.passthrough()
    }),
  )

  await using client = createClient({
    url: testServer.ws.url().href,
    connectionParams: { authorization: 'Bearer abc-123' },
  })
  const subscription = client.iterate({
    query: gql`
      subscription OnCommentAdded {
        commentAdded {
          text
        }
      }
    `,
  })

  await expect(subscription.next()).resolves.toEqual({
    done: false,
    value: { data: { commentAdded: { text: 'hello world' } } },
  })

  // The client's `connectionParams` must reach the original server
  // unchanged, otherwise it cannot authorize this client.
  expect(connectionParamsListener).toHaveBeenCalledWith({
    authorization: 'Bearer abc-123',
  })
})

it('bypasses a subscription', async () => {
  await using testServer = await createTestGraphQLServer({
    schema: createSchema({
      typeDefs: gql`
        type Comment {
          text: String!
        }

        type Query {
          comments: [Comment!]!
        }

        type Subscription {
          commentAdded: Comment!
        }
      `,
      resolvers: {
        Subscription: {
          commentAdded: {
            async *subscribe() {
              yield { commentAdded: { text: 'hello world' } }
            },
          },
        },
      },
    }),
  })

  const api = graphql.link(testServer.http.url().href)
  server.use(
    api.subscription('OnCommentAdded', async ({ subscription }) => {
      const onCommentAddedSubscription = subscription.passthrough()
      onCommentAddedSubscription.addEventListener('next', () => {
        onCommentAddedSubscription.unsubscribe()
      })
    }),
  )

  await using client = createClient({
    url: testServer.ws.url().href,
  })
  const subscription = client.iterate({
    query: gql`
      subscription OnCommentAdded {
        commentAdded {
          text
        }
      }
    `,
  })

  // Must receive the payload from the original server.
  await expect(subscription.next()).resolves.toEqual({
    value: {
      data: {
        commentAdded: {
          text: 'hello world',
        },
      },
    },
    done: false,
  })
})

it('augments original server subscription payload', async () => {
  await using testServer = await createTestGraphQLServer({
    schema: createSchema({
      typeDefs: gql`
        type Comment {
          text: String!
        }

        type Query {
          comments: [Comment!]!
        }

        type Subscription {
          commentAdded: Comment!
        }
      `,
      resolvers: {
        Subscription: {
          commentAdded: {
            async *subscribe() {
              yield { commentAdded: { text: 'hello world' } }
            },
          },
        },
      },
    }),
  })

  const api = graphql.link(testServer.http.url().href)
  server.use(
    api.subscription('OnCommentAdded', async ({ subscription }) => {
      const onCommentAddedSubscription = subscription.passthrough()
      onCommentAddedSubscription.addEventListener('next', (event) => {
        // Prevent the default server-to-client forwarding.
        event.preventDefault()

        // Publish the modified payload to the client.
        const { payload } = event.data
        payload.data = {
          commentAdded: {
            text: String(payload.data?.commentAdded?.text).toUpperCase(),
          },
        }

        subscription.publish(payload)

        onCommentAddedSubscription.unsubscribe()
      })
    }),
  )

  await using client = createClient({
    url: testServer.ws.url().href,
  })
  const subscription = client.iterate({
    query: gql`
      subscription OnCommentAdded {
        commentAdded {
          text
        }
      }
    `,
  })

  // Must receive the payload from the original server.
  await expect(subscription.next()).resolves.toEqual({
    value: {
      data: {
        commentAdded: {
          text: 'HELLO WORLD',
        },
      },
    },
    done: false,
  })
})

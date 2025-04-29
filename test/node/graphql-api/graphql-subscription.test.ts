// @vitest-environment node-websocket
import { graphql, HttpResponse, PathParams } from 'msw'
import { setupServer } from 'msw/node'
import { DeferredPromise } from '@open-draft/deferred-promise'
import { createTestHttpServer } from '@epic-web/test-server/http'
import { createWebSocketMiddleware } from '@epic-web/test-server/ws'
import {
  createPubSub,
  createSchema,
  createYoga,
  YogaSchemaDefinition,
} from 'graphql-yoga'
import { createClient } from 'graphql-ws'
import { useServer } from 'graphql-ws/lib/use/ws'

const server = setupServer()

beforeAll(() => {
  server.listen()
})

afterEach(() => {
  server.resetHandlers()
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

  const client = createClient({
    url: 'ws://localhost:4000/graphql',
  })
  const subscription = client.iterate({
    query: /* GraphQL */ `
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

it('supports marking a subscription as complete', async () => {
  const api = graphql.link('http://localhost:4000/graphql')

  server.use(
    api.subscription('OnCommentAdded', ({ subscription }) => {
      queueMicrotask(() => {
        subscription.complete()
      })
    }),
  )

  const client = createClient({
    url: 'ws://localhost:4000/graphql',
  })
  const subscription = client.iterate({
    query: /* GraphQL */ `
      subscription OnCommentAdded {
        commentAdded {
          text
        }
      }
    `,
  })

  await expect(subscription.next()).resolves.toMatchObject({
    done: true,
  })
})

it('exposes path parameters from the WebSocket link', async () => {
  const paramsPromise = new DeferredPromise<PathParams>()
  const api = graphql.link('https://api.example.com/:service')

  server.use(
    api.subscription('OnCommentAdded', ({ params, subscription }) => {
      paramsPromise.resolve(params)
      subscription.complete()
    }),
  )

  const client = createClient({
    url: 'wss://api.example.com/user-service',
  })
  const subscription = client.iterate({
    query: /* GraphQL */ `
      subscription OnCommentAdded {
        commentAdded {
          text
        }
      }
    `,
  })

  await subscription.next()

  await expect(paramsPromise).resolves.toEqual({
    service: 'user-service',
  })
})

it('supports subscribing to extraneous pubsubs', async () => {
  const pubsub = createPubSub<{ commentAdded: [{ text: string }] }>()

  const api = graphql.link('https://api.example.com/graphql')
  server.use(
    api.subscription('OnCommentAdded', ({ subscription }) => {
      // Subscribe to another pubsub.
      subscription.from(pubsub.subscribe('commentAdded'))
    }),
    api.mutation('AddComment', ({ variables }) => {
      const { comment } = variables

      // Publish new data to the pubsub on mutation.
      pubsub.publish('commentAdded', comment)

      return HttpResponse.json({
        data: { comment },
      })
    }),
  )

  const client = createClient({
    url: 'wss://api.example.com/graphql',
  })
  const subscription = client.iterate({
    query: /* GraphQL */ `
      subscription OnCommentAdded {
        commentAdded {
          text
        }
      }
    `,
  })

  // Post a new comment using GraphQL mutation.
  const comment = { text: 'hello world' }
  await fetch('https://api.example.com/graphql', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      query: /* GraphQL */ `
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
      data: comment,
    },
  })
})

async function createTestGraphQLServer(options: {
  pathname?: string
  schema: YogaSchemaDefinition<{}, {}>
}) {
  const pathname = options.pathname || '/graphql'

  const yoga = createYoga({
    schema: options.schema,
    graphiql: false,
  })

  const testServer = await createTestHttpServer({
    defineRoutes(router) {
      router.get('/graphql/*', ({ req }) => {
        return yoga.fetch(req.raw)
      })
    },
  })
  const wss = createWebSocketMiddleware({
    server: testServer,
    pathname: yoga.graphqlEndpoint,
  })

  const disposeOfServer = useServer(
    {
      execute: (args: any) => args.execute(args),
      subscribe: (args: any) => args.subscribe(args),
      onSubscribe: async (ctx, params) => {
        const { schema, execute, subscribe, contextFactory, parse, validate } =
          yoga.getEnveloped({
            ...ctx,
            req: ctx.extra.request,
            socket: ctx.extra.socket,
            params,
          })

        const args = {
          schema,
          operationName: params.payload.operationName,
          document: parse(params.payload.query),
          variableValues: params.payload.variables,
          contextValue: await contextFactory(),
          execute,
          subscribe,
        }

        const errors = validate(args.schema, args.document)
        if (errors.length) return errors
        return args
      },
    },
    wss.raw,
  )

  return {
    async [Symbol.asyncDispose]() {
      await Promise.all([
        testServer[Symbol.asyncDispose](),
        wss[Symbol.asyncDispose](),
      ])
      await disposeOfServer.dispose()
    },
    http: {
      url() {
        return testServer.http.url(pathname)
      },
    },
    ws: {
      url() {
        return wss.ws.url()
      },
    },
  }
}

it('supports bypassing a subscription', async () => {
  await using testServer = await createTestGraphQLServer({
    schema: createSchema({
      typeDefs: /* GraphQL */ `
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
      const commentSubscription = subscription.subscribe()
      commentSubscription.addEventListener('next', () => {
        commentSubscription.unsubscribe()
      })
    }),
  )

  const client = createClient({
    url: testServer.ws.url().href,
  })
  const subscription = client.iterate({
    query: /* GraphQL */ `
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

it('supports augmenting original server subscription payload', async () => {
  await using testServer = await createTestGraphQLServer({
    schema: createSchema({
      typeDefs: /* GraphQL */ `
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
      const commentSubscription = subscription.subscribe()
      commentSubscription.addEventListener('next', (event) => {
        // Prevent the default server-to-client forwarding.
        event.preventDefault()

        // Publish the modified payload to the client.
        const { payload } = event.data
        // @ts-expect-error Missing payload type.
        payload.data.commentAdded.text =
          // @ts-expect-error Missing payload type.
          payload.data.commentAdded.text.toUpperCase()

        subscription.publish(event.data.payload)

        commentSubscription.unsubscribe()
      })
    }),
  )

  const client = createClient({
    url: testServer.ws.url().href,
  })
  const subscription = client.iterate({
    query: /* GraphQL */ `
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

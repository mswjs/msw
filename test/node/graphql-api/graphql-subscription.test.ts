// @vitest-environment node-websocket
import { graphql, PathParams } from 'msw'
import { setupServer } from 'msw/node'
import { DeferredPromise } from '@open-draft/deferred-promise'
import { createTestHttpServer } from '@epic-web/test-server/http'
import { createWebSocketMiddleware } from '@epic-web/test-server/ws'
import { createSchema, createYoga } from 'graphql-yoga'
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

it('supports bypassing a subscription', async () => {
  const yoga = createYoga({
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
    graphiql: false,
  })

  await using testServer = await createTestHttpServer({
    defineRoutes(router) {
      router.get('/graphql/*', ({ req }) => {
        return yoga.fetch(req.raw)
      })
    },
  })
  await using wss = createWebSocketMiddleware({
    server: testServer,
    pathname: yoga.graphqlEndpoint,
  })

  useServer(
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

  const api = graphql.link(testServer.http.url('/graphql').href)
  server.use(
    api.subscription('OnCommentAdded', async ({ subscription }) => {
      const commentSubscription = subscription.subscribe()
      commentSubscription.addEventListener('next', () => {
        commentSubscription.unsubscribe()
      })
    }),
  )

  const wsUrl = testServer.http.url('/graphql')
  wsUrl.protocol = 'ws'

  const client = createClient({
    url: wsUrl.href,
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

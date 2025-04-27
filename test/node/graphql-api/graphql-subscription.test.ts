// @vitest-environment node-websocket
import { graphql, PathParams } from 'msw'
import { setupServer } from 'msw/node'
import { DeferredPromise } from '@open-draft/deferred-promise'
import { createTestHttpServer } from '@epic-web/test-server/http'
import { createWebSocketMiddleware } from '@epic-web/test-server/ws'
import { buildSchema } from 'graphql'
import { CloseCode, createClient, makeServer } from 'graphql-ws'

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
    query: `
subscription OnCommentAdded {
  commentAdded {
    id
    text
  }
}
    `,
  })

  await expect(subscription.next()).resolves.toMatchObject({
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

it('marks subscription as complete by calling `subscription.complete`', async () => {
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
    query: `
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
    query: `
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

it.only('supports bypassing GraphQL subscriptions', async () => {
  await using testServer = await createTestHttpServer()
  await using wss = createWebSocketMiddleware({
    server: testServer,
    pathname: '/graphql',
  })
  const graphQLServer = makeServer({
    schema: buildSchema(`

type Comment {
  text: String!
}

type Subscription {
  commentAdded: Comment!
}

subscription OnCommentAdded {
  commentAdded {
    text
  }
}
      `),
    subscribe(args) {
      return {
        [Symbol.asyncIterator]() {
          return {
            next() {
              return Promise.resolve({
                done: false,
                value: {
                  data: {
                    commentAdded: {
                      text: 'Hello world',
                    },
                  },
                },
              })
            },
          }
        },
      }
    },
  })
  wss.on('connection', (socket, request) => {
    const closed = graphQLServer.opened(
      {
        protocol: socket.protocol,
        send: (data) => {
          return new Promise((resolve, reject) => {
            socket.send(data, (error) => (error ? reject(error) : resolve()))
          })
        },
        close: (code, reason) => {
          socket.close(code, reason)
        },
        onMessage: (callback) => {
          socket.on('message', async (event) => {
            console.log('message:', event.toString())

            try {
              await callback(event.toString())
            } catch (error) {
              console.error(error)
              socket.close(
                CloseCode.InternalServerError,
                error instanceof Error ? error.message : error?.toString(),
              )
            }
          })
        },
      },
      { socket, request },
    )

    socket.once('close', (code, reason) => closed(code, reason.toString()))
  })

  const api = graphql.link(testServer.http.url('/graphql').href)
  server.use(
    api.subscription('OnCommentAdded', async ({ subscription }) => {
      const commentSubscription = subscription.subscribe()

      commentSubscription.addEventListener('next', (event) => {
        event.preventDefault()

        console.log('EVENT!')

        // subscription.publish({
        //   data: event.data.payload,
        // })

        commentSubscription.unsubscribe()
      })
    }),
  )

  const client = createClient({
    url: wss.ws.url().href,
  })
  const subscription = client.iterate({
    query: `
subscription OnCommentAdded {
  commentAdded {
    text
  }
}
    `,
  })

  await subscription.next()
  /**
   * @fixme Expect the subscription payload from the ACTUAL server.
   */
  // await expect(subscription.next()).resolves.toEqual({ foo: 'bar' })
})

// @vitest-environment node
import { setTimeout } from 'node:timers/promises'
import { http, passthrough, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { graphql } from 'msw/graphql'
import { createClient } from 'graphql-ws'
import { createSchema } from 'graphql-yoga'
import { gql } from '../../support/graphql'
import { createTestGraphQLServer } from '../../support/graphqlServer'

const server = setupServer()

beforeAll(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {})
  server.listen()
})

afterEach(() => {
  vi.clearAllMocks()
  server.resetHandlers()
})

afterAll(() => {
  vi.restoreAllMocks()
  server.close()
})

it('runs after a handler that returns nothing', async () => {
  const cleanup = vi.fn()

  server.use(
    http.get('http://localhost/resource', ({ finalize }) => {
      finalize(cleanup)
    }),
  )

  await fetch('http://localhost/resource').catch(() => {})
  expect(cleanup).toHaveBeenCalledOnce()
})

it('runs after a handler returns a response', async () => {
  const cleanup = vi.fn()

  server.use(
    http.get('http://localhost/resource', ({ finalize }) => {
      finalize(cleanup)
      return new Response()
    }),
  )

  await fetch('http://localhost/resource')
  expect(cleanup).toHaveBeenCalledOnce()
})

it('runs after a handler that throws a response', async () => {
  const cleanup = vi.fn()

  server.use(
    http.get('http://localhost/resource', ({ finalize }) => {
      finalize(cleanup)
      throw new Response()
    }),
  )

  await fetch('http://localhost/resource')
  expect(cleanup).toHaveBeenCalledOnce()
})

it('runs after a handler that throws an error', async () => {
  const cleanup = vi.fn()

  server.use(
    http.get('http://localhost/resource', ({ finalize }) => {
      finalize(cleanup)
      throw new Error('Custom reason')
    }),
  )

  await fetch('http://localhost/resource').catch(() => {})
  expect(cleanup).toHaveBeenCalledOnce()
})

it('runs after a handler that passes through', async () => {
  const cleanup = vi.fn()

  server.use(
    http.get('http://localhost/resource', ({ finalize }) => {
      finalize(cleanup)
      return passthrough()
    }),
  )

  await fetch('http://localhost/resource').catch(() => {})
  expect(cleanup).toHaveBeenCalledOnce()
})

it('runs an asynchronous cleanup before the response is returned', async () => {
  const cleanup = vi.fn()

  server.use(
    http.get('http://localhost/resource', ({ finalize }) => {
      finalize(async () => {
        await setTimeout(250)
        cleanup()
      })

      return new Response()
    }),
  )

  const responseReceived = vi.fn()
  await fetch('http://localhost/resource').then(responseReceived)
  expect(cleanup).toHaveBeenCalledOnce()
  expect(cleanup).toHaveBeenCalledBefore(responseReceived)
})

it('runs multiple cleanups as LIFO', async () => {
  const cleanupOne = vi.fn()
  const cleanupTwo = vi.fn()

  server.use(
    http.get('http://localhost/resource', ({ finalize }) => {
      finalize(cleanupOne)
      finalize(cleanupTwo)
      return new Response()
    }),
  )

  await fetch('http://localhost/resource')
  expect(cleanupOne).toHaveBeenCalledOnce()
  expect(cleanupTwo).toHaveBeenCalledOnce()
  expect(cleanupTwo).toHaveBeenCalledBefore(cleanupOne)
})

it('runs after the request has been aborted', async () => {
  const cleanup = vi.fn()

  server.use(
    http.get('http://localhost/resource', async ({ finalize }) => {
      finalize(cleanup)
      await setTimeout(250)
      return new Response()
    }),
  )

  const controller = new AbortController()
  const responsePromise = fetch('http://localhost/resource', {
    signal: controller.signal,
  })
  await setTimeout(100)
  controller.abort()

  await expect(responsePromise).rejects.toThrow()
  expect(cleanup).toHaveBeenCalledOnce()
})

it('runs immediately when scheduled after the request has been aborted', async () => {
  const cleanup = vi.fn()

  server.use(
    http.get('http://localhost/resource', async ({ finalize }) => {
      // Await past the point where the request gets aborted so the
      // first `finalize` access happens on an already-aborted signal.
      await setTimeout(250)
      finalize(cleanup)

      // Simulate a long-lived resolver that never settles.
      await new Promise(() => {})
    }),
  )

  const controller = new AbortController()
  const responsePromise = fetch('http://localhost/resource', {
    signal: controller.signal,
  })
  await setTimeout(100)
  controller.abort()

  await expect(responsePromise).rejects.toThrow()
  await expect.poll(() => cleanup).toHaveBeenCalledOnce()
})

it('runs cleanups scheduled after the abort listener has fired', async () => {
  const cleanupBeforeAbort = vi.fn()
  const cleanupAfterAbort = vi.fn()

  server.use(
    http.get('http://localhost/resource', async ({ finalize }) => {
      finalize(cleanupBeforeAbort)

      // Await past the point where the request gets aborted
      // (the "abort" listener fires and runs `cleanupBeforeAbort`).
      await setTimeout(250)
      finalize(cleanupAfterAbort)

      // Simulate a long-lived resolver that never settles.
      await new Promise(() => {})
    }),
  )

  const controller = new AbortController()
  const responsePromise = fetch('http://localhost/resource', {
    signal: controller.signal,
  })
  await setTimeout(100)
  controller.abort()

  await expect(responsePromise).rejects.toThrow()
  await expect.poll(() => cleanupBeforeAbort).toHaveBeenCalledOnce()
  await expect.poll(() => cleanupAfterAbort).toHaveBeenCalledOnce()
})

it('runs once the generator resolver is exhausted', async () => {
  const cleanup = vi.fn()

  server.use(
    http.get('http://localhost/resource', function* ({ finalize }) {
      finalize(cleanup)

      yield new Response('yield')
      return new Response('final')
    }),
  )

  {
    const response = await fetch('http://localhost/resource')
    await expect(response.text()).resolves.toBe('yield')
    expect(cleanup).not.toHaveBeenCalled()
  }

  {
    const response = await fetch('http://localhost/resource')
    await expect(response.text()).resolves.toBe('final')
    expect(cleanup).toHaveBeenCalled()
  }

  {
    const response = await fetch('http://localhost/resource')
    await expect(response.text()).resolves.toBe('final')
    expect(cleanup).toHaveBeenCalledOnce()
  }
})

it('runs once the returned iterator is exhausted', async () => {
  const cleanup = vi.fn()

  server.use(
    http.get('http://localhost/resource', async ({ finalize }) => {
      finalize(cleanup)

      /**
       * @note This is an edge case, but it's, technically, allowed.
       */
      return (async function* () {
        yield new Response('yield')
        return new Response('final')
      })()
    }),
  )

  {
    const response = await fetch('http://localhost/resource')
    await expect(response.text()).resolves.toBe('yield')
    expect(cleanup).not.toHaveBeenCalled()
  }

  {
    const response = await fetch('http://localhost/resource')
    await expect(response.text()).resolves.toBe('final')
    expect(cleanup).toHaveBeenCalled()
  }

  {
    const response = await fetch('http://localhost/resource')
    await expect(response.text()).resolves.toBe('final')
    expect(cleanup).toHaveBeenCalledOnce()
  }
})

it('runs after a GraphQL query handler returns a response', async () => {
  const cleanup = vi.fn()

  server.use(
    graphql.query('GetUser', ({ finalize }) => {
      finalize(cleanup)
      return HttpResponse.json({ data: { user: { id: '1' } } })
    }),
  )

  const response = await fetch('http://localhost/graphql', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      query: `query GetUser { user { id } }`,
    }),
  })

  await expect(response.json()).resolves.toEqual({
    data: { user: { id: '1' } },
  })
  expect(cleanup).toHaveBeenCalledOnce()
})

it('runs after a GraphQL subscription is completed by the mock', async () => {
  const cleanup = vi.fn()

  const api = graphql.link('http://localhost:4000/graphql')
  server.use(
    api.subscription('OnCommentAdded', ({ subscription, finalize }) => {
      finalize(cleanup)
      queueMicrotask(() => {
        subscription.complete()
      })
    }),
  )

  const client = createClient({
    url: 'ws://localhost:4000/graphql',
    lazy: false,
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
  expect(cleanup).toHaveBeenCalledOnce()

  await client.dispose()
})

it('runs after a GraphQL subscription is completed by the client', async () => {
  const cleanup = vi.fn()
  const resolverCalled = Promise.withResolvers<void>()

  const api = graphql.link('http://localhost:4000/graphql')
  server.use(
    api.subscription('OnCommentAdded', ({ finalize }) => {
      finalize(cleanup)
      resolverCalled.resolve()
    }),
  )

  // `lazy: false` keeps the socket open after the subscription ends.
  // Otherwise the client closes it, and the cleanup would run via the
  // disconnect path instead of the client's "complete" frame.
  const client = createClient({
    url: 'ws://localhost:4000/graphql',
    lazy: false,
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

  // Begin the subscription, then await it being established so the
  // client's "complete" frame cannot outrace the handshake.
  subscription.next()
  await resolverCalled.promise
  expect(cleanup).not.toHaveBeenCalled()

  // Unsubscribing sends a "complete" frame from the client.
  await subscription.return?.()

  await expect.poll(() => cleanup).toHaveBeenCalledOnce()

  await client.dispose()
})

it('runs after a GraphQL subscription is completed by the original server', async () => {
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
            // The server yields a single value and completes
            // the subscription right after.
            async *subscribe() {
              yield { commentAdded: { text: 'hello world' } }
            },
          },
        },
      },
    }),
  })

  const cleanup = vi.fn()

  const api = graphql.link(testServer.http.url().href)
  server.use(
    api.subscription('OnCommentAdded', ({ subscription, finalize }) => {
      finalize(cleanup)
      subscription.passthrough()
    }),
  )

  // `lazy: false` keeps the socket open once the server completes the
  // subscription, so the cleanup cannot run via the disconnect path.
  const client = createClient({
    url: testServer.ws.url().href,
    lazy: false,
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

  // The cleanup runs once the original server completes the subscription.
  await expect.poll(() => cleanup).toHaveBeenCalledOnce()

  await client.dispose()
})

it('runs cleanup for parallel requests', async () => {
  const cleanup = vi.fn()

  server.use(
    http.get('http://localhost/resource', ({ finalize }) => {
      finalize(cleanup)
      return new Response()
    }),
  )

  await Promise.all([
    fetch('http://localhost/resource'),
    fetch('http://localhost/resource'),
  ])

  expect(cleanup).toHaveBeenCalledTimes(2)
})

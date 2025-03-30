// @vitest-environment node-websocket
import { graphql, PathParams } from 'msw'
import { setupServer } from 'msw/node'
import { createClient } from 'graphql-ws'
import { DeferredPromise } from '@open-draft/deferred-promise'

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

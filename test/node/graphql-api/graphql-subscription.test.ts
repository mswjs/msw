// @vitest-environment node
import { graphql } from 'msw'
import { setupServer } from 'msw/node'
import { createClient } from 'graphql-ws'

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
    api.pubsub.handler,
    api.subscription('OnCommendAdded', () => {
      api.pubsub.publish({
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
subscription OnCommendAdded {
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

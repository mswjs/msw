// @vitest-environment node
import { createClient } from 'graphql-ws'
import { setupServer } from 'msw/node'
import { graphql } from 'msw/graphql'

const server = setupServer()

beforeAll(() => {
  server.listen()
})

afterEach(() => {
  server.resetHandlers()
  server.events.removeAllListeners()
})

afterAll(() => {
  server.close()
})

it('emits the "graphql:subscription" event when a subscription is established', async () => {
  const subscriptionListener = vi.fn()
  server.events.on('graphql:subscription', subscriptionListener)

  const api = graphql.link('https://localhost/graphql')
  server.use(api.subscription('OnCommentAdded', () => {}))

  const query = `subscription OnCommentAdded { commentAdded { text } }`
  const client = createClient({
    url: 'wss://localhost/graphql',
  })
  const subscription = client.iterate({
    query,
    variables: { postId: 'post-1' },
  })

  await expect.poll(() => subscriptionListener.mock.calls.length).toBe(1)

  expect(subscriptionListener).toHaveBeenCalledTimes(1)

  const [subscriptionEvent] = subscriptionListener.mock.calls[0]
  expect(subscriptionEvent).toBeInstanceOf(Event)
  expect(subscriptionEvent.type).toBe('graphql:subscription')
  expect(subscriptionEvent.operationName).toBe('OnCommentAdded')
  expect(subscriptionEvent.query).toBe(query)
  expect(subscriptionEvent.variables).toEqual({ postId: 'post-1' })
  expect(subscriptionEvent.request).toBeInstanceOf(Request)
  expect(subscriptionEvent.request.url).toBe('wss://localhost/graphql')
  expect(subscriptionEvent.request.headers.get('connection')).toBe('upgrade')
  expect(subscriptionEvent.request.headers.get('upgrade')).toBe('websocket')
})

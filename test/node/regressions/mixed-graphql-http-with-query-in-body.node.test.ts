// @vitest-environment jsdom
import { graphql, http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'

const mswGraphql = graphql.link('https://mswjs.com/graphql')
const server = setupServer()

beforeAll(async () => {
  server.listen()
})

afterEach(() => {
  server.resetHandlers()
})

afterAll(async () => {
  server.close()
})

test('no console error occurs when the http handler is first', async () => {
  server.use(
    http.post('https://mswjs.com/example', () => {
      return HttpResponse.text('http route')
    }),
    mswGraphql.query('GetData', () => {
      return HttpResponse.json({
        data: {
          data: 'graphql route',
        },
      })
    }),
    graphql.query('GetOtherUser', () => {
      return HttpResponse.json({
        data: {
          data: 'graphql route',
        },
      })
    }),
  )

  const consoleError = vi.spyOn(console, 'error')
  const response = await fetch('https://mswjs.com/example', {
    method: 'POST',
    body: JSON.stringify({
      query: 'some query',
    }),
  })
  await expect(response.text()).resolves.toEqual('http route')

  const graphqlResponse = await fetch('https://mswjs.com/graphql', {
    method: 'POST',
    body: JSON.stringify({
      query: 'query GetData { id }',
    }),
  })
  await expect(graphqlResponse.json()).resolves.toEqual({
    data: { data: 'graphql route' },
  })

  expect(consoleError).not.toHaveBeenCalled()
})

test('no console error occurs when the http handler is first, but we apply a use after it', async () => {
  server.use(
    http.post('https://mswjs.com/example', () => {
      return HttpResponse.text('http route')
    }),
    mswGraphql.query('GetData', () => {
      return HttpResponse.json({
        data: { data: 'graphql route' },
      })
    }),
  )

  server.use(
    mswGraphql.query('GetData', () => {
      return HttpResponse.json({
        data: {
          data: 'graphql route',
        },
      })
    }),
  )

  const consoleError = vi.spyOn(console, 'error')
  const response = await fetch('https://mswjs.com/example', {
    method: 'POST',
    body: JSON.stringify({
      query: 'some query',
    }),
  })
  await expect(response.text()).resolves.toEqual('http route')

  const graphqlResponse = await fetch('https://mswjs.com/graphql', {
    method: 'POST',
    body: JSON.stringify({
      query: 'query GetData { id }',
    }),
  })
  await expect(graphqlResponse.json()).resolves.toEqual({
    data: { data: 'graphql route' },
  })
  expect(consoleError).not.toHaveBeenCalled()
})

test('no console error occurs when the http handler is second to the graphql handler', async () => {
  server.use(
    mswGraphql.query('GetData', () => {
      return HttpResponse.json({
        data: {
          data: 'graphql route',
        },
      })
    }),
    http.post('https://mswjs.com/example', () => {
      return HttpResponse.text('http route')
    }),
  )

  const consoleError = vi.spyOn(console, 'error')
  const response = await fetch('https://mswjs.com/example', {
    method: 'POST',
    body: JSON.stringify({
      query: 'some query',
    }),
  })
  await expect(response.text()).resolves.toEqual('http route')

  const graphqlResponse = await fetch('https://mswjs.com/graphql', {
    method: 'POST',
    body: JSON.stringify({
      query: 'query GetData { id }',
    }),
  })
  await expect(graphqlResponse.json()).resolves.toEqual({
    data: { data: 'graphql route' },
  })
  expect(consoleError).not.toHaveBeenCalled()
})

test("a console error occurs when the http handler is second to the graphql handler, and we don't use link", async () => {
  server.use(
    graphql.query('GetData', () => {
      return HttpResponse.json({
        data: {
          data: 'graphql route',
        },
      })
    }),
    http.post('https://mswjs.com/example', () => {
      return HttpResponse.text('http route')
    }),
  )

  const consoleError = vi.spyOn(console, 'error')
  const response = await fetch('https://mswjs.com/example', {
    method: 'POST',
    body: JSON.stringify({
      query: 'some query',
    }),
  })
  await expect(response.text()).resolves.toEqual('http route')
  expect(consoleError).not.toHaveBeenNthCalledWith(
    1,
    expect.stringContaining('[MSW] Failed to intercept a GraphQL request'),
  )

  const graphqlResponse = await fetch('https://mswjs.com/graphql', {
    method: 'POST',
    body: JSON.stringify({
      query: 'query GetData { id }',
    }),
  })
  await expect(graphqlResponse.json()).resolves.toEqual({
    data: { data: 'graphql route' },
  })
})

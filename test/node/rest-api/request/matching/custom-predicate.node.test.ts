// @vitest-environment node
import { http } from 'msw'
import { setupServer } from 'msw/node'

const server = setupServer()

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'bypass' })
})

afterEach(() => {
  server.resetHandlers()
})

afterAll(() => {
  server.close()
})

it('matches requests when the predicate function returns true', async () => {
  server.use(
    http.post(
      async ({ request }) => {
        const requestBody = await request.clone().text()
        return requestBody === 'hello world'
      },
      async ({ request }) => {
        return new Response(request.clone().body, request)
      },
    ),
  )

  const response = await fetch('http://localhost/irrelevant', {
    method: 'POST',
    body: 'hello world',
  })

  expect.soft(response.status).toBe(200)
  await expect.soft(response.text()).resolves.toBe('hello world')
})

it('does not match requests when the predicate function returns false', async () => {
  server.use(
    http.post(
      async ({ request }) => {
        const requestBody = await request.clone().text()
        return requestBody === 'hello world'
      },
      async ({ request }) => {
        return new Response(request.clone().body, request)
      },
    ),
  )

  await expect(
    fetch('http://localhost/irrelevant', {
      method: 'POST',
      body: 'non-matching-request',
    }),
  ).rejects.toThrow('fetch failed')
})

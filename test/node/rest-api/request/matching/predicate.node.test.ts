/**
 * @vitest-environment node
 */
import { HttpServer } from '@open-draft/test-server/http'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'

const httpServer = new HttpServer((app) => {
  app.all('*', (_, res) => res.status(204).end())
})

const server = setupServer()

beforeAll(async () => {
  await httpServer.listen()

  server.listen({
    onUnhandledRequest: 'bypass',
  })
})

afterEach(() => {
  server.resetHandlers()
})

afterAll(async () => {
  server.close()
  await httpServer.close()
})

beforeEach(() => {
  server.use(
    http.post(
      async ({ request }) => {
        const body = await request.clone().json()
        return body.foo === 'bar'
      },
      () => {
        return HttpResponse.json({ matched: true })
      },
    ),
  )
})

test('matches requests when the predicate function returns true', async () => {
  const response = await fetch(httpServer.http.url('/api/foo'), {
    method: 'POST',
    body: JSON.stringify({ foo: 'bar' }),
    headers: { 'Content-Type': 'application/json' },
  })
  expect(response.status).toBe(200)
  expect(await response.json()).toEqual({ matched: true })
})

test('does not match requests when the predicate function returns false', async () => {
  const response = await fetch(httpServer.http.url('/api/foo'), {
    method: 'POST',
    body: JSON.stringify({ foo: 'baz' }),
    headers: { 'Content-Type': 'application/json' },
  })
  expect(response.status).toBe(204)
})

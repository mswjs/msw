// @vitest-environment node
import { HttpResponse, http } from 'msw'
import { setupServer } from 'msw/node'
import { createTestHttpServer } from '@epic-web/test-server/http'

const server = setupServer()

beforeAll(() => {
  server.listen()
})

afterEach(() => {
  server.resetHandlers()
  vi.restoreAllMocks()
})

afterAll(() => {
  server.close()
})

test('does not read the body while parsing an unhandled request', async () => {
  await using httpServer = await createTestHttpServer({
    defineRoutes(router) {
      router.post('/resource', async (context) => {
        const body = await context.req.json()
        return Response.json({ response: `received: ${body.message}` })
      })
    },
  })
  // Expecting an unhandled request warning in this test.
  vi.spyOn(console, 'warn').mockImplementation(() => {})

  const requestUrl = httpServer.http.url('/resource').href
  const response = await fetch(requestUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message: 'Hello server',
    }),
  })
  expect(await response.json()).toEqual({ response: `received: Hello server` })
})

test('does not read the body while parsing an unhandled request', async () => {
  await using httpServer = await createTestHttpServer({
    defineRoutes(router) {
      router.post('/resource', async (context) => {
        const body = await context.req.json()
        return Response.json({ response: `received: ${body.message}` })
      })
    },
  })
  const requestUrl = httpServer.http.url('/resource').href
  server.use(
    http.post(requestUrl, () => {
      return HttpResponse.json({ mocked: true })
    }),
  )
  const response = await fetch(requestUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message: 'Hello server',
    }),
  })
  expect(await response.json()).toEqual({ mocked: true })
})

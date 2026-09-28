// @vitest-environment node
import { http, bypass } from 'msw'
import { setupServer } from 'msw/node'
import { createTestHttpServer } from '@epic-web/test-server/http'

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

test('supports patching an original HTTP response', async () => {
  await using httpServer = await createTestHttpServer({
    defineRoutes(router) {
      router.post('/resource', async (context) => {
        return Response.json(
          {
            text: await context.req.text(),
            requestHeaders: context.req.header(),
          },
          {
            headers: {
              'access-control-allow-headers': '*',
            },
          },
        )
      })
    },
  })

  server.use(
    http.post(httpServer.http.url('/resource').href, async ({ request }) => {
      const originalResponse = await fetch(bypass(request))
      const { text, requestHeaders } = await originalResponse.json()
      return new Response(text.toUpperCase(), { headers: requestHeaders })
    }),
  )

  const response = await fetch(httpServer.http.url('/resource'), {
    method: 'POST',
    body: 'world',
  })

  await expect(response.text()).resolves.toBe('WORLD')

  // Must not contain the internal bypass request header.
  expect(Object.fromEntries(response.headers)).toHaveProperty('accept', '*/*')
})

test('preserves request "accept" header when patching a response', async () => {
  await using httpServer = await createTestHttpServer({
    defineRoutes(router) {
      router.post('/resource', async (context) => {
        return Response.json(
          {
            text: await context.req.text(),
            requestHeaders: context.req.header(),
          },
          {
            headers: {
              'access-control-allow-headers': '*',
            },
          },
        )
      })
    },
  })

  server.use(
    http.post(httpServer.http.url('/resource').href, async ({ request }) => {
      const originalResponse = await fetch(bypass(request))
      const { text, requestHeaders } = await originalResponse.json()
      return new Response(text.toUpperCase(), { headers: requestHeaders })
    }),
  )

  const response = await fetch(httpServer.http.url('/resource'), {
    method: 'POST',
    headers: {
      accept: 'application/json',
    },
    body: 'world',
  })

  await expect(response.text()).resolves.toBe('WORLD')

  // Must not contain the internal bypass request header.
  expect(Object.fromEntries(response.headers)).toHaveProperty(
    'accept',
    'application/json',
  )
})

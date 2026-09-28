// @vitest-environment node
import { createTestHttpServer } from '@epic-web/test-server/http'
import { setupServer } from 'msw/node'

const server = setupServer()

beforeAll(() => {
  server.listen({ onUnhandledFrame: 'bypass' })

  vi.spyOn(global.console, 'error').mockImplementation(() => void 0)
  vi.spyOn(global.console, 'warn').mockImplementation(() => void 0)
})

afterAll(() => {
  vi.restoreAllMocks()
  server.close()
})

test('bypasses unhandled requests', async () => {
  await using httpServer = await createTestHttpServer({
    defineRoutes(router) {
      router.get('/resource', () => {
        return new Response('original-response')
      })
    },
  })

  const response = await fetch(httpServer.http.url('/resource'))

  // Request should be performed as-is
  expect(response.status).toBe(200)
  expect(await response.text()).toEqual('original-response')

  // No warnings/errors should be printed
  expect(console.error).not.toBeCalled()
  expect(console.warn).not.toBeCalled()
})

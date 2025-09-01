/**
 * @see https://github.com/mswjs/msw/issues/2370
 */
// @vitest-environment node
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { HttpServer } from '@open-draft/test-server/http'

const server = setupServer()

const httpServer = new HttpServer((app) => {
  app.get('/resource', (_req, res) => {
    res.send('original')
  })
})

beforeAll(async () => {
  server.listen()
  await httpServer.listen()
})

afterEach(() => {
  server.resetHandlers()
})

afterAll(async () => {
  server.close()
  await httpServer.close()
})

it('intercepts a request once `server.listen()` is called after `server.close()`', async () => {
  const requestUrl = httpServer.http.url('/resource')

  server.use(
    http.get(requestUrl, () => {
      return HttpResponse.text('mocked')
    }),
  )

  // Must respond with a mocked response while MSW is active.
  {
    const response = await fetch(requestUrl)
    await expect(response.text()).resolves.toBe('mocked')
  }

  server.close()

  // Must respond with the original response once MSW is closed.
  {
    const response = await fetch(requestUrl)
    await expect(response.text()).resolves.toBe('original')
  }

  server.listen()

  // Must respond with the mocked response once MSW is active again.
  {
    const response = await fetch(requestUrl)
    await expect(response.text()).resolves.toBe('mocked')
  }
})

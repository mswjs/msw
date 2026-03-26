/**
 * @see https://github.com/mswjs/msw/issues/2617
 */
// @vitest-environment node
import http from 'node:http'
import { setupServer } from 'msw/node'
import { vi } from 'vitest'

const server = setupServer()

const httpServer = http.createServer(async (_req, res) => {
  await new Promise<void>((resolve) => setTimeout(resolve, 100))
  res.writeHead(200, { 'content-type': 'application/json' })
  res.end(JSON.stringify({ ok: true }))
})

let port: number

beforeAll(async () => {
  server.listen({ onUnhandledRequest: 'bypass' })

  await new Promise<void>((resolve) => {
    httpServer.listen(0, () => {
      port = (httpServer.address() as any).port
      resolve()
    })
  })
})

afterAll(async () => {
  server.close()

  await new Promise<void>((resolve, reject) => {
    httpServer.close((error) => (error ? reject(error) : resolve()))
  })
})

it('emits a single error when ClientRequest is destroyed with an error', async () => {
  const onError = vi.fn()
  const error = new Error('MyAbortError')

  const request = http.request({
    hostname: '127.0.0.1',
    port,
    path: '/',
    method: 'GET',
  })

  request.on('error', onError)
  request.end()

  await new Promise<void>((resolve) => {
    setTimeout(() => {
      request.destroy(error)
      setTimeout(resolve, 50)
    }, 10)
  })

  expect(onError).toHaveBeenCalledTimes(1)
  expect(onError).toHaveBeenCalledWith(error)
})

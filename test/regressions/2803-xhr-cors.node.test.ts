// @vitest-environment jsdom
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'

const server = setupServer()

beforeAll(() => {
  server.listen({ onUnhandledFrame: 'error' })
})

afterEach(() => {
  server.resetHandlers()
})

afterAll(() => {
  server.close()
})

/**
 * The JSDOM document URL is at "http://localhost" while the request targets
 * "http://localhost:8081", which makes JSDOM treat the request as cross-origin.
 */
test('resolves a cross-origin XMLHttpRequest with a mocked response that has no CORS headers', async () => {
  server.use(
    http.get('http://localhost:8081/resource', () => {
      return HttpResponse.text('hello world', {
        headers: {
          'access-control-allow-origin': '*',
        },
      })
    }),
  )

  const pendingRequest = Promise.withResolvers<void>()
  const request = new XMLHttpRequest()
  request.open('GET', 'http://localhost:8081/resource')
  request.onload = () => pendingRequest.resolve()
  request.onerror = () => {
    pendingRequest.reject(new Error('XMLHttpRequest request error'))
  }
  request.send()

  await expect(pendingRequest.promise).resolves.toBeUndefined()

  expect.soft(request.status).toBe(200)
  expect(request.responseText).toBe('hello world')
})

test('resolves a cross-origin XMLHttpRequest that triggers a preflight request', async () => {
  server.use(
    /**
     * @note JSDOM has its own rules for when to trigger the preflight OPTIONS request.
     * For example, including custom headers is one of them. Those rules are proprietary
     * and do not mirror the browser preflight policies.
     */
    http.options('*', () => {
      return new HttpResponse(null, {
        status: 204,
        headers: {
          'access-control-allow-origin': '*',
          'access-control-allow-headers': 'x-custom-header',
        },
      })
    }),
    http.get('http://localhost:8081/resource', () => {
      return HttpResponse.text('hello world', {
        headers: {
          'access-control-allow-origin': '*',
        },
      })
    }),
  )

  const pendingRequest = Promise.withResolvers<void>()
  const request = new XMLHttpRequest()
  request.open('GET', 'http://localhost:8081/resource')
  request.setRequestHeader('x-custom-header', 'yes')
  request.onload = () => pendingRequest.resolve()
  request.onerror = () => {
    pendingRequest.reject(new Error('XMLHttpRequest request error'))
  }
  request.send()

  await expect(pendingRequest.promise).resolves.toBeUndefined()

  expect.soft(request.status).toBe(200)
  expect(request.responseText).toBe('hello world')
})

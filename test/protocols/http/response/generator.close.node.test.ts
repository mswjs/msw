// @vitest-environment node
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'

const server = setupServer()

async function fetchJson(input: string | URL | Request, init?: RequestInit) {
  return fetch(input, init).then((response) => response.json())
}

beforeAll(() => {
  server.listen()
})

afterEach(() => {
  server.resetHandlers()
})

afterAll(() => {
  server.close()
})

test('calls generator cleanup when closing the server with a mid-flight generator', async () => {
  const cleanup = vi.fn()

  server.use(
    http.get('http://localhost/resource', function* () {
      try {
        yield HttpResponse.json('Yield')
        return HttpResponse.json('Stable')
      } finally {
        cleanup()
      }
    }),
  )

  await expect(fetchJson('http://localhost/resource')).resolves.toBe('Yield')
  expect(cleanup).not.toHaveBeenCalled()

  server.close()
  // Resume the server right away so the shared lifecycle stays intact.
  server.listen()

  expect(cleanup).toHaveBeenCalledOnce()
})

test('closes the server when the cleanup of a mid-flight generator fails', async () => {
  vi.spyOn(console, 'error').mockImplementation(() => {})
  onTestFinished(() => vi.restoreAllMocks())

  const cleanup = vi.fn(() => {
    throw new Error('Reason')
  })

  server.use(
    http.get('http://localhost/resource', function* () {
      try {
        yield HttpResponse.json('Yield')
        return HttpResponse.json('Stable')
      } finally {
        cleanup()
      }
    }),
  )

  await expect(fetchJson('http://localhost/resource')).resolves.toBe('Yield')

  server.close()
  // Resume the server right away so the shared lifecycle stays intact.
  server.listen()

  await expect
    .poll(() => console.error)
    .toHaveBeenCalledWith(
      expect.stringContaining(
        '[MSW] Failed to execute cleanup for request handler "GET http://localhost/resource"',
      ),
    )
})

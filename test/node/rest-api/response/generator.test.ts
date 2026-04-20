// @vitest-environment node
import { http, HttpResponse, delay } from 'msw'
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

it('supports generator function as response resolver', async () => {
  server.use(
    http.get('http://localhost/weather', function* () {
      let degree = 10

      while (degree < 13) {
        degree++
        yield HttpResponse.json(degree)
      }

      degree++
      return HttpResponse.json(degree)
    }),
  )

  // Must respond with yielded responses.
  await expect(fetchJson('http://localhost/weather')).resolves.toBe(11)
  await expect(fetchJson('http://localhost/weather')).resolves.toBe(12)
  await expect(fetchJson('http://localhost/weather')).resolves.toBe(13)
  // Must respond with the final "done" response.
  await expect(fetchJson('http://localhost/weather')).resolves.toBe(14)
  // Must keep responding with the final "done" response.
  await expect(fetchJson('http://localhost/weather')).resolves.toBe(14)
})

it('supports async generator function as response resolver', async () => {
  server.use(
    http.get('http://localhost/weather', async function* () {
      await delay(20)

      let degree = 10

      while (degree < 13) {
        degree++
        yield HttpResponse.json(degree)
      }

      degree++
      return HttpResponse.json(degree)
    }),
  )

  await expect(fetchJson('http://localhost/weather')).resolves.toBe(11)
  await expect(fetchJson('http://localhost/weather')).resolves.toBe(12)
  await expect(fetchJson('http://localhost/weather')).resolves.toBe(13)
  await expect(fetchJson('http://localhost/weather')).resolves.toBe(14)
  await expect(fetchJson('http://localhost/weather')).resolves.toBe(14)
})

it('supports generator function as one-time response resolver', async () => {
  server.use(
    http.get(
      'http://localhost/weather',
      function* () {
        let degree = 10

        while (degree < 13) {
          degree++
          yield HttpResponse.json(degree)
        }

        degree++
        return HttpResponse.json(degree)
      },
      { once: true },
    ),
    http.get('*', () => {
      return HttpResponse.json('fallback')
    }),
  )

  // Must respond with the yielded incrementing responses.
  await expect(fetchJson('http://localhost/weather')).resolves.toBe(11)
  await expect(fetchJson('http://localhost/weather')).resolves.toBe(12)
  await expect(fetchJson('http://localhost/weather')).resolves.toBe(13)
  // Must respond with the "done" final response from the iterator.
  await expect(fetchJson('http://localhost/weather')).resolves.toBe(14)
  // Must respond with the other handler since the generator one is used.
  await expect(fetchJson('http://localhost/weather')).resolves.toBe('fallback')
  await expect(fetchJson('http://localhost/weather')).resolves.toBe('fallback')
})

it('resets the generator state after the handlers are reset', async () => {
  server.use(
    http.get('http://localhost/resource', function* () {
      yield HttpResponse.json('Yield')
      return HttpResponse.json('Stable')
    }),
  )

  await server.boundary(async () => {
    await expect(fetchJson('http://localhost/resource')).resolves.toBe('Yield')
    await expect(fetchJson('http://localhost/resource')).resolves.toBe('Stable')

    server.resetHandlers()

    await expect(fetchJson('http://localhost/resource')).resolves.toBe('Yield')
    await expect(fetchJson('http://localhost/resource')).resolves.toBe('Stable')
  })()
})

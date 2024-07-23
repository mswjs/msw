/**
 * @vitest-environment node
 */
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
    http.get('https://example.com/weather', function* () {
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
  await expect(fetchJson('https://example.com/weather')).resolves.toEqual(11)
  await expect(fetchJson('https://example.com/weather')).resolves.toEqual(12)
  await expect(fetchJson('https://example.com/weather')).resolves.toEqual(13)
  // Must respond with the final "done" response.
  await expect(fetchJson('https://example.com/weather')).resolves.toEqual(14)
  // Must keep responding with the final "done" response.
  await expect(fetchJson('https://example.com/weather')).resolves.toEqual(14)
})

it('supports async generator function as response resolver', async () => {
  server.use(
    http.get('https://example.com/weather', async function* () {
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

  await expect(fetchJson('https://example.com/weather')).resolves.toEqual(11)
  await expect(fetchJson('https://example.com/weather')).resolves.toEqual(12)
  await expect(fetchJson('https://example.com/weather')).resolves.toEqual(13)
  await expect(fetchJson('https://example.com/weather')).resolves.toEqual(14)
  await expect(fetchJson('https://example.com/weather')).resolves.toEqual(14)
})

it('supports generator function as one-time response resolver', async () => {
  server.use(
    http.get(
      'https://example.com/weather',
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
  await expect(fetchJson('https://example.com/weather')).resolves.toEqual(11)
  await expect(fetchJson('https://example.com/weather')).resolves.toEqual(12)
  await expect(fetchJson('https://example.com/weather')).resolves.toEqual(13)
  // Must respond with the "done" final response from the iterator.
  await expect(fetchJson('https://example.com/weather')).resolves.toEqual(14)
  // Must respond with the other handler since the generator one is used.
  await expect(fetchJson('https://example.com/weather')).resolves.toEqual(
    'fallback',
  )
  await expect(fetchJson('https://example.com/weather')).resolves.toEqual(
    'fallback',
  )
})

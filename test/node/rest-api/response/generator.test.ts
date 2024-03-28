/**
 * @vitest-environment node
 */
import { http, HttpResponse, delay } from 'msw'
import { setupServer } from 'msw/node'

const server = setupServer()
const toJson = (response: Response) => response.json()

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
  expect(await fetch('https://example.com/weather').then(toJson)).toEqual(11)
  expect(await fetch('https://example.com/weather').then(toJson)).toEqual(12)
  expect(await fetch('https://example.com/weather').then(toJson)).toEqual(13)
  // Must respond with the final "done" response.
  expect(await fetch('https://example.com/weather').then(toJson)).toEqual(14)
  // Must keep responding with the final "done" response.
  expect(await fetch('https://example.com/weather').then(toJson)).toEqual(14)
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

  expect(await fetch('https://example.com/weather').then(toJson)).toEqual(11)
  expect(await fetch('https://example.com/weather').then(toJson)).toEqual(12)
  expect(await fetch('https://example.com/weather').then(toJson)).toEqual(13)
  expect(await fetch('https://example.com/weather').then(toJson)).toEqual(14)
  expect(await fetch('https://example.com/weather').then(toJson)).toEqual(14)
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
  expect(await fetch('https://example.com/weather').then(toJson)).toEqual(11)
  expect(await fetch('https://example.com/weather').then(toJson)).toEqual(12)
  expect(await fetch('https://example.com/weather').then(toJson)).toEqual(13)
  // Must respond with the "done" final response from the iterator.
  expect(await fetch('https://example.com/weather').then(toJson)).toEqual(14)
  // Must respond with the other handler since the generator one is used.
  expect(await fetch('https://example.com/weather').then(toJson)).toEqual(
    'fallback',
  )
  expect(await fetch('https://example.com/weather').then(toJson)).toEqual(
    'fallback',
  )
})

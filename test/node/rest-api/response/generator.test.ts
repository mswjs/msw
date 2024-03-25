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

      if (degree < 12) {
        degree++
        yield HttpResponse.json(degree)
      }

      return HttpResponse.json(degree)
    }),
  )

  expect(await fetch('https://example.com/weather').then(toJson)).toEqual(11)
  expect(await fetch('https://example.com/weather').then(toJson)).toEqual(12)
  expect(await fetch('https://example.com/weather').then(toJson)).toEqual(13)
  expect(await fetch('https://example.com/weather').then(toJson)).toEqual(13)
})

it('supports async generator function as response resolver', async () => {
  server.use(
    http.get('https://example.com/weather', async function* () {
      await delay(20)

      let degree = 10

      if (degree < 12) {
        degree++
        yield HttpResponse.json(degree)
      }

      return HttpResponse.json(degree)
    }),
  )

  expect(await fetch('https://example.com/weather').then(toJson)).toEqual(11)
  expect(await fetch('https://example.com/weather').then(toJson)).toEqual(12)
  expect(await fetch('https://example.com/weather').then(toJson)).toEqual(13)
  expect(await fetch('https://example.com/weather').then(toJson)).toEqual(13)
})

// @vitest-environment node
import { HttpResponse, http } from 'msw'
import { setupServer } from 'msw/node'

const server = setupServer(
  http.get('http://localhost/json', () => {
    return HttpResponse.json({ firstName: 'John' })
  }),
  http.get('http://localhost/number', () => {
    return HttpResponse.json(123)
  }),
)

beforeAll(() => {
  server.listen()
})

afterAll(() => {
  server.close()
})

it('responds with a JSON response body', async () => {
  const response = await fetch('http://localhost/json')

  expect(response.headers.get('Content-Type')).toBe('application/json')
  expect(await response.json()).toEqual({ firstName: 'John' })
})

it('responds with a single number JSON response body', async () => {
  const response = await fetch('http://localhost/number')

  expect(response.headers.get('Content-Type')).toBe('application/json')
  expect(await response.json()).toEqual(123)
})

it('implicitly sets "Content-Length" header on the mocked response', async () => {
  const response = await fetch('http://localhost/json')
  expect(response.headers.get('Content-Length')).toBe('20')
})

it('implicitly sets "Content-Length" to 0 if the mocked response body is empty', async () => {
  server.use(
    http.get('http://localhost/json', () => {
      return HttpResponse.json()
    }),
  )

  const response = await fetch('http://localhost/json')
  expect(response.headers.get('Content-Length')).toBe('0')
})

it('respects custom "Content-Length" mocked response header', async () => {
  server.use(
    http.get('http://localhost/json', () => {
      return HttpResponse.json(
        { firstName: 'John' },
        {
          headers: {
            'Content-Length': '32',
          },
        },
      )
    }),
  )

  const response = await fetch('http://localhost/json')
  expect(response.headers.get('Content-Length')).toBe('32')
})

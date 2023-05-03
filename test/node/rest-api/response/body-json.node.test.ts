/**
 * @jest-environment node
 */
import { HttpResponse, rest } from 'msw'
import { setupServer } from 'msw/node'

const server = setupServer(
  rest.get('http://localhost/json', () => {
    return HttpResponse.json({ firstName: 'John' })
  }),
  rest.get('http://localhost/number', () => {
    return HttpResponse.json(123)
  }),
)

beforeAll(() => {
  server.listen()
})

afterAll(() => {
  server.close()
})

test('responds with a JSON response body', async () => {
  const response = await fetch('http://localhost/json')

  expect(response.headers.get('content-type')).toBe('application/json')
  expect(await response.json()).toEqual({ firstName: 'John' })
})

test('responds with a single number JSON response body', async () => {
  const response = await fetch('http://localhost/number')

  expect(response.headers.get('content-type')).toBe('application/json')
  expect(await response.json()).toEqual(123)
})

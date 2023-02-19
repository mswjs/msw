/**
 * @jest-environment node
 */
import fetch from 'node-fetch'
import { rest } from 'msw'
import { setupServer } from 'msw/node'

const server = setupServer(
  rest.get('http://localhost/json', (req, res, ctx) => {
    return res(ctx.json({ firstName: 'John' }))
  }),
  rest.get('http://localhost/number', (req, res, ctx) => {
    return res(ctx.json(123))
  }),
)

beforeAll(() => {
  server.listen()
})

afterAll(() => {
  server.close()
})

test('responds with a JSON response body', async () => {
  const res = await fetch('http://localhost/json')

  expect(res.headers.get('content-type')).toBe('application/json')

  const json = await res.json()
  expect(json).toEqual({ firstName: 'John' })
})

test('responds with a single number JSON response body', async () => {
  const res = await fetch('http://localhost/number')

  expect(res.headers.get('content-type')).toBe('application/json')

  const json = await res.json()
  expect(json).toEqual(123)
})

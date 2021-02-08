/**
 * @jest-environment node
 */
import fetch from 'node-fetch'
import { rest } from 'msw'
import { setupServer } from 'msw/node'

const server = setupServer(
  rest.get('http://localhost/text', (req, res, ctx) => {
    return res(ctx.text('hello world'))
  }),
)

beforeAll(() => {
  server.listen()
})

afterAll(() => {
  server.close()
})

test('responds with a text response body', async () => {
  const res = await fetch('http://localhost/text')
  const text = await res.text()

  expect(res.headers.get('content-type')).toBe('text/plain')
  expect(text).toBe('hello world')
})

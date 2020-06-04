/**
 * @jest-environment node
 */
import fetch from 'node-fetch'
import { rest } from 'msw'
import { setupServer } from 'msw/node'

const server = setupServer(
  rest.get('/books', (req, res, ctx) => {
    return res(ctx.json([1, 2, 3]))
  }),
  rest.get('https://api.backend.com/path', (req, res, ctx) => {
    return res(ctx.json({ success: true }))
  }),
)

beforeAll(() => server.listen())
afterAll(() => server.close())

test('tolerates relative request handlers on the server', async () => {
  const res = await fetch('https://api.backend.com/path')
  const body = await res.json()

  expect(res.status).toBe(200)
  expect(body).toEqual({ success: true })
})

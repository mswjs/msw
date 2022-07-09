/**
 * @jest-environment node
 */
import fetch from 'node-fetch'
import { rest } from 'msw'
import { setupServer } from 'msw/node'
import { encodeBuffer } from '@mswjs/interceptors'

const server = setupServer(
  rest.post('http://localhost/resource', async (req, res, ctx) => {
    const body = await req.text()
    return res(ctx.text(body))
  }),
)

beforeAll(() => {
  server.listen()
})

afterAll(() => {
  server.close()
})

test('reads plain text request body as text', async () => {
  const res = await fetch('http://localhost/resource', {
    method: 'POST',
    headers: {
      'Content-Type': 'text/plain',
    },
    body: 'hello-world',
  })
  const body = await res.text()

  expect(res.status).toBe(200)
  expect(body).toBe('hello-world')
})

test('reads json request body as text', async () => {
  const res = await fetch('http://localhost/resource', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ firstName: 'John' }),
  })
  const body = await res.text()

  expect(res.status).toBe(200)
  expect(body).toBe(`{"firstName":"John"}`)
})

test('reads array buffer request body as text', async () => {
  const res = await fetch('http://localhost/resource', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: encodeBuffer('hello-world'),
  })
  const body = await res.text()

  expect(res.status).toBe(200)
  expect(body).toBe('hello-world')
})

/**
 * @jest-environment node
 */
import fetch from 'node-fetch'
import { rest } from 'msw'
import { setupServer } from 'msw/node'
import { encodeBuffer } from '@mswjs/interceptors'

const server = setupServer(
  rest.post('http://localhost/arrayBuffer', async (req, res, ctx) => {
    const arrayBuffer = await req.arrayBuffer()
    return res(ctx.body(arrayBuffer))
  }),
)

beforeAll(() => {
  server.listen()
})

afterAll(() => {
  server.close()
})

test('reads text request body as array buffer', async () => {
  const res = await fetch('http://localhost/arrayBuffer', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: 'foo bar',
  })
  const body = await res.arrayBuffer()

  expect(res.status).toBe(200)
  expect(body).toEqual(encodeBuffer('foo bar'))
})

test('reads array buffer request body as array buffer', async () => {
  const res = await fetch('http://localhost/arrayBuffer', {
    method: 'POST',
    body: encodeBuffer('foo bar'),
  })
  const body = await res.arrayBuffer()

  expect(res.status).toBe(200)
  expect(body).toEqual(encodeBuffer('foo bar'))
})

test('reads null request body as empty array buffer', async () => {
  const res = await fetch('http://localhost/arrayBuffer', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: null,
  })
  const body = await res.arrayBuffer()

  expect(res.status).toBe(200)
  expect(body).toEqual(encodeBuffer(''))
})

test('reads undefined request body as empty array buffer', async () => {
  const res = await fetch('http://localhost/arrayBuffer', {
    method: 'POST',
    body: undefined,
  })
  const body = await res.arrayBuffer()

  expect(res.status).toBe(200)
  expect(body).toEqual(encodeBuffer(''))
})

/**
 * @jest-environment node
 */
import fetch from 'node-fetch'
import { HttpResponse, rest } from 'msw'
import { setupServer } from 'msw/node'
import { encodeBuffer } from '@mswjs/interceptors'

const server = setupServer(
  rest.post('http://localhost/arrayBuffer', async ({ request }) => {
    const arrayBuffer = await request.arrayBuffer()
    return HttpResponse.arrayBuffer(arrayBuffer)
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
  expect(body).toEqual(encodeBuffer('foo bar').buffer)
})

test('reads array buffer request body as array buffer', async () => {
  const res = await fetch('http://localhost/arrayBuffer', {
    method: 'POST',
    body: encodeBuffer('foo bar'),
  })
  const body = await res.arrayBuffer()

  expect(res.status).toBe(200)
  expect(body).toEqual(encodeBuffer('foo bar').buffer)
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
  expect(body).toEqual(encodeBuffer('').buffer)
})

test('reads undefined request body as empty array buffer', async () => {
  const res = await fetch('http://localhost/arrayBuffer', {
    method: 'POST',
    body: undefined,
  })
  const body = await res.arrayBuffer()

  expect(res.status).toBe(200)
  expect(body).toEqual(encodeBuffer('').buffer)
})

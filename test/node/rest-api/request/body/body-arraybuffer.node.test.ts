/**
 * @jest-environment node
 */
import fetch from 'node-fetch'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'

function encodeBuffer(value: unknown) {
  return Buffer.from(JSON.stringify(value)).buffer
}

const server = setupServer(
  http.post('http://localhost/arrayBuffer', async ({ request }) => {
    const requestBodyBuffer = await request.arrayBuffer()
    return HttpResponse.arrayBuffer(requestBodyBuffer)
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
    body: undefined,
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

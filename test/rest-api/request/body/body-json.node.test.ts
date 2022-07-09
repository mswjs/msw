/**
 * @jest-environment node
 */
import fetch from 'node-fetch'
import { rest } from 'msw'
import { setupServer } from 'msw/node'
import { encodeBuffer } from '@mswjs/interceptors'

const server = setupServer(
  rest.post('http://localhost/deprecated', (req, res, ctx) => {
    return res(ctx.json(req.body))
  }),
  rest.post('http://localhost/json', async (req, res, ctx) => {
    const json = await req.json()
    return res(ctx.json(json))
  }),
)

beforeAll(() => {
  server.listen()
})

afterAll(() => {
  server.close()
})

test('reads request body as json', async () => {
  const res = await fetch('http://localhost/deprecated', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ firstName: 'John' }),
  })
  const json = await res.json()

  expect(res.status).toBe(200)
  expect(json).toEqual({ firstName: 'John' })
})

test('reads a single number as json request body', async () => {
  const res = await fetch('http://localhost/deprecated', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(123),
  })
  const json = await res.json()

  expect(res.status).toBe(200)
  expect(json).toEqual(123)
})

test('reads request body using json() method', async () => {
  const res = await fetch('http://localhost/json', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ firstName: 'John' }),
  })
  const json = await res.json()

  expect(res.status).toBe(200)
  expect(json).toEqual({ firstName: 'John' })
})

test('reads array buffer request body using json() method', async () => {
  const res = await fetch('http://localhost/json', {
    method: 'POST',
    body: encodeBuffer(JSON.stringify({ firstName: 'John' })),
  })
  const json = await res.json()

  expect(res.status).toBe(200)
  expect(json).toEqual({ firstName: 'John' })
})

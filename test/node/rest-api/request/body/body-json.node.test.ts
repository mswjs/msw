/**
 * @jest-environment node
 */
import fetch from 'node-fetch'
import { HttpResponse, rest } from 'msw'
import { setupServer } from 'msw/node'
import { encodeBuffer } from '@mswjs/interceptors'

const server = setupServer(
  rest.post('http://localhost/json', async ({ request }) => {
    return HttpResponse.json(await request.json())
  }),
)

beforeAll(() => {
  server.listen()
})

afterAll(() => {
  server.close()
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

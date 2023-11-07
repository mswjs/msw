/**
 * @jest-environment node
 */
import fetch from 'node-fetch'
import { HttpResponse, http } from 'msw'
import { setupServer } from 'msw/node'

const server = setupServer(
  http.get('http://localhost/empty', () => {
    return HttpResponse.empty()
  }),
)

beforeAll(() => {
  server.listen()
})

afterAll(() => {
  server.close()
})

test('responds with an empty response body', async () => {
  const res = await fetch('http://localhost/empty')
  const body = await res.buffer()

  expect(res.status).toBe(204)
  expect(res.headers.get('content-type')).toBeNull()
  expect(body.byteLength).toBe(0)
})

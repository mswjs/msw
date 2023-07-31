/**
 * @jest-environment node
 */
import fetch from 'node-fetch'
import { HttpResponse, http } from 'msw'
import { setupServer } from 'msw/node'

const server = setupServer(
  http.get('/books', () => {
    return HttpResponse.json([1, 2, 3])
  }),
  http.get('https://api.backend.com/path', () => {
    return HttpResponse.json({ success: true })
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

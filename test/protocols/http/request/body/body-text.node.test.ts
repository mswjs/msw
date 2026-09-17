// @vitest-environment node
import { HttpResponse, http } from 'msw'
import { setupServer } from 'msw/node'
import { encodeBuffer } from '@mswjs/interceptors'

const server = setupServer(
  http.post('http://localhost/resource', async ({ request }) => {
    return HttpResponse.text(await request.text())
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
    body: encodeBuffer('hello-world'),
  })
  const body = await res.text()

  expect(res.status).toBe(200)
  expect(body).toBe('hello-world')
})

test('reads null request body as empty text', async () => {
  const res = await fetch('http://localhost/resource', {
    method: 'POST',
    body: null as any,
  })
  const body = await res.text()

  expect(res.status).toBe(200)
  expect(body).toBe('')
})

test('reads undefined request body as empty text', async () => {
  const res = await fetch('http://localhost/resource', {
    method: 'POST',
  })
  const body = await res.text()

  expect(res.status).toBe(200)
  expect(body).toBe('')
})

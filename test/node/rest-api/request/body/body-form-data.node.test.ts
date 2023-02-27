/**
 * @jest-environment node
 */
import fetch from 'node-fetch'
import FormDataPolyfill from 'form-data'
import { HttpResponse, rest } from 'msw'
import { setupServer } from 'msw/node'

const server = setupServer(
  rest.post('http://localhost/resource', async ({ request }) => {
    const formData = await request.formData()
    return HttpResponse.json(Array.from(formData.entries()))
  }),
)

beforeAll(() => {
  server.listen()
})

afterAll(() => {
  server.close()
})

test('reads FormData request body', async () => {
  // Note that creating a `FormData` instance in Node/JSDOM differs
  // from the same instance in a real browser. Follow the instructions
  // of your `fetch` polyfill to learn more.
  const formData = new FormDataPolyfill()
  formData.append('username', 'john.maverick')
  formData.append('password', 'secret123')

  const res = await fetch('http://localhost/resource', {
    method: 'POST',
    headers: formData.getHeaders(),
    body: formData,
  })
  const json = await res.json()

  expect(res.status).toBe(200)
  expect(json).toEqual([
    ['username', 'john.maverick'],
    ['password', 'secret123'],
  ])
})

import fetch from 'node-fetch'
import * as FormDataPolyfill from 'form-data'
import { rest } from 'msw'
import { setupServer } from 'msw/node'

const server = setupServer(
  rest.post('http://test.example/sign-in', (req, res, ctx) => {
    return res(ctx.json(req.body))
  }),
)

beforeAll(() => {
  server.listen()
})

afterAll(() => {
  server.close()
})

test('handles "FormData" as a request body', async () => {
  // Note that creating a `FormData` instance in Node/JSDOM differs
  // from the same instance in a real browser. Follow the instructions
  // of your `fetch` polyfill to learn more.
  const formData = new FormDataPolyfill()
  formData.append('username', 'john.maverick')
  formData.append('password', 'secret123')

  const res = await fetch('http://test.example/sign-in', {
    method: 'POST',
    headers: formData.getHeaders(),
    body: formData,
  })
  const json = await res.json()

  expect(res.status).toBe(200)
  expect(json).toEqual({
    username: 'john.maverick',
    password: 'secret123',
  })
})

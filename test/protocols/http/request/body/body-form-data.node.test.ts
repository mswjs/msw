/**
 * @vitest-environment node
 */
import { HttpResponse, http } from 'msw'
import { setupServer } from 'msw/node'

const server = setupServer(
  http.post('http://localhost/resource', async ({ request }) => {
    const formData = await request.formData()
    return HttpResponse.json(Array.from(formData.entries()))
  }),
  http.post('http://localhost/file', async ({ request }) => {
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      throw HttpResponse.text('Missing file', { status: 400 })
    }

    return HttpResponse.json({
      name: file.name,
      size: file.size,
      content: await file.text(),
    })
  }),
)

beforeAll(() => {
  server.listen()
})

afterAll(() => {
  server.close()
})

it('supports FormData request body', async () => {
  // Note that creating a `FormData` instance in Node/JSDOM differs
  // from the same instance in a real browser. Follow the instructions
  // of your `fetch` polyfill to learn more.
  const formData = new FormData()
  formData.append('username', 'john.maverick')
  formData.append('password', 'secret123')

  const res = await fetch('http://localhost/resource', {
    method: 'POST',
    body: formData,
  })
  const json = await res.json()

  expect.soft(res.status).toBe(200)
  expect(json).toEqual([
    ['username', 'john.maverick'],
    ['password', 'secret123'],
  ])
})

it('respects Blob size in request body', async () => {
  const blob = new Blob([JSON.stringify({ data: 1 })], {
    type: 'application/json',
  })
  const formData = new FormData()
  formData.set('file', blob, 'data.json')

  const response = await fetch('http://localhost/file', {
    method: 'POST',
    body: formData,
  })

  expect.soft(response.status).toBe(200)
  await expect(response.json()).resolves.toEqual({
    name: 'data.json',
    size: blob.size,
    content: await blob.text(),
  })
})

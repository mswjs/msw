import { it, beforeEach } from '#/tests/future/globals'
import { http, HttpResponse } from 'msw'

beforeEach(({ worker }) => {
  worker.use(
    http.post('/resource', async ({ request }) => {
      return HttpResponse.text(await request.text())
    }),
  )
})

it.concurrent('reads a plain text request body as text', async ({ worker }) => {
  const response = await fetch('/resource', {
    method: 'POST',
    body: 'hello world',
  })

  await expect(response.text()).resolves.toBe('hello world')
})

it.concurrent('reads a json request body as text', async ({ worker }) => {
  const response = await fetch('/resource', {
    method: 'POST',
    body: JSON.stringify({ firstName: 'John' }),
    headers: { 'content-type': 'application/json' },
  })

  await expect(response.text()).resolves.toBe('{"firstName":"John"}')
})

it.concurrent('reads a buffer request body as text', async ({ worker }) => {
  const response = await fetch('/resource', {
    method: 'POST',
    body: new TextEncoder().encode('hello world'),
  })

  await expect(response.text()).resolves.toBe('hello world')
})

it.concurrent('reads a null request body as empty text', async ({ worker }) => {
  const response = await fetch('/resource', {
    method: 'POST',
    body: null,
  })

  await expect(response.text()).resolves.toBe('')
})

it.concurrent(
  'reads an explicitly undefined request body as empty text',
  async ({ worker }) => {
    const response = await fetch('/resource', {
      method: 'POST',
      body: undefined,
    })

    await expect(response.text()).resolves.toBe('')
  },
)

it.concurrent(
  'reads a request without a body as empty text',
  async ({ worker }) => {
    const response = await fetch('/resource', {
      method: 'POST',
    })

    await expect(response.text()).resolves.toBe('')
  },
)

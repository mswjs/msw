import { http, HttpResponse } from 'msw'
import { defineNetwork, expect } from '../../../../setup/vitest-helpers'

const handlers = [
  http.post('*/text', async ({ request }) => {
    return HttpResponse.text(await request.text())
  }),
  http.post('*/json', async ({ request }) => {
    return HttpResponse.json(await request.json())
  }),
  http.post('*/arrayBuffer', async ({ request }) => {
    return HttpResponse.arrayBuffer(await request.arrayBuffer())
  }),
  http.post('*/formData', async ({ request }) => {
    const data = await request.formData()
    const name = data.get('name')
    const file = data.get('file') as File
    const fileText = await file.text()
    const ids = data.get('ids') as File
    const idsJson = JSON.parse(await ids.text())

    return HttpResponse.json({
      name,
      file: fileText,
      ids: idsJson,
    })
  }),
]

const test = defineNetwork({ handlers })

test('reads plain text request body as text', async ({ fetch }) => {
  const res = await fetch('/text', {
    method: 'POST',
    headers: {
      'Content-Type': 'text/plain',
    },
    body: 'hello-world',
  })
  const body = await res.text()

  expect(res.status()).toBe(200)
  expect(body).toBe('hello-world')
})

test('reads json request body as text', async ({ fetch }) => {
  const res = await fetch('/text', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ firstName: 'John' }),
  })
  const body = await res.text()

  expect(res.status()).toBe(200)
  expect(body).toBe(`{"firstName":"John"}`)
})

test('reads buffer request body as text', async ({ page, makeUrl }) => {
  page.evaluate(() => {
    return fetch('/text', {
      method: 'POST',
      body: new TextEncoder().encode('hello-world'),
    })
  })
  const res = await page.waitForResponse(makeUrl('/text'))
  const body = await res.text()

  expect(res.status()).toBe(200)
  expect(body).toBe('hello-world')
})

test('reads null request body as empty text', async ({ page }) => {
  const [body, status] = await page.evaluate(() => {
    return fetch('/text', {
      method: 'POST',
      body: null,
    }).then((res) => res.text().then((text) => [text, res.status]))
  })

  expect(status).toBe(200)
  expect(body).toBe('')
})

test('reads undefined request body as empty text', async ({ page }) => {
  const [body, status] = await page.evaluate(() => {
    return fetch('/text', {
      method: 'POST',
      body: undefined,
    }).then((res) => res.text().then((text) => [text, res.status]))
  })

  expect(status).toBe(200)
  expect(body).toBe('')
})

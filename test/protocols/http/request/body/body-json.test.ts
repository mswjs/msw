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

test('reads request body as json', async ({ fetch, page }) => {
  const res = await fetch('/json', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ firstName: 'John' }),
  })

  const json = await res.json()

  expect(res.status()).toBe(200)
  expect(json).toEqual({ firstName: 'John' })
})

test('reads a single number as json request body', async ({ fetch }) => {
  const res = await fetch('/json', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(123),
  })
  const json = await res.json()

  expect(res.status()).toBe(200)
  expect(json).toEqual(123)
})

test('reads request body using json() method', async ({ fetch }) => {
  const res = await fetch('/json', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ firstName: 'John' }),
  })
  const json = await res.json()

  expect(res.status()).toBe(200)
  expect(json).toEqual({ firstName: 'John' })
})

test('reads array buffer request body using json() method', async ({
  fetch,
  page,
  makeUrl,
}) => {
  page.evaluate(() => {
    return fetch('/json', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: new TextEncoder().encode(
        JSON.stringify({
          firstName: 'John',
        }),
      ),
    })
  })
  const res = await page.waitForResponse(makeUrl('/json'))
  const json = await res.json()

  expect(res.status()).toBe(200)
  expect(json).toEqual({ firstName: 'John' })
})

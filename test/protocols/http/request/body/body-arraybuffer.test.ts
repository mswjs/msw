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

test('reads request body as array buffer', async ({ fetch }) => {
  const res = await fetch('/json', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ firstName: 'John' }),
  })
  const body = await res.body()

  expect(res.status()).toBe(200)
  expect(body).toEqual(
    new TextEncoder().encode(JSON.stringify({ firstName: 'John' })),
  )
})

test('reads buffer request body as array buffer', async ({
  fetch,
  page,
  makeUrl,
}) => {
  page.evaluate(() => {
    return fetch('/json', {
      method: 'POST',
      body: new TextEncoder().encode(JSON.stringify({ firstName: 'John' })),
    })
  })
  const res = await page.waitForResponse(makeUrl('/json'))
  const body = await res.body()

  expect(res.status()).toBe(200)
  expect(body).toEqual(
    new TextEncoder().encode(JSON.stringify({ firstName: 'John' })),
  )
})

test('reads null request body as empty array buffer', async ({ page }) => {
  const [body, status] = await page.evaluate(() => {
    return fetch('/arrayBuffer', {
      method: 'POST',
      body: null,
    }).then((res) =>
      res
        .arrayBuffer()
        .then((body) => [new TextDecoder().decode(body), res.status]),
    )
  })

  expect(status).toBe(200)
  expect(body).toBe('')
})

test('reads undefined request body as empty array buffer', async ({ page }) => {
  const [body, status] = await page.evaluate(() => {
    return fetch('/arrayBuffer', {
      method: 'POST',
      body: undefined,
    }).then((res) =>
      res
        .arrayBuffer()
        .then((body) => [new TextDecoder().decode(body), res.status]),
    )
  })

  expect(status).toBe(200)
  expect(body).toBe('')
})

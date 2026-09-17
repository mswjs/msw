import { http, HttpResponse } from 'msw'
import { defineNetwork, expect } from '../../../../setup/vitest-helpers'

const handlers = [
  http.get('https://test.mswjs.io/reflect-url/:url', ({ params }) => {
    const { url } = params
    return HttpResponse.json({ url })
  }),
]

const test = defineNetwork({ handlers })

test('decodes url componets', async ({ fetch }) => {
  const url = 'http://example.com:5001/example'
  const res = await fetch(
    `https://test.mswjs.io/reflect-url/${encodeURIComponent(url)}`,
  )

  expect(res.status()).toBe(200)
  expect(res.fromServiceWorker()).toBe(true)
  expect(await res.json()).toEqual({
    url,
  })
})

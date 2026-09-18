import { http, HttpResponse } from 'msw'
import { defineTestNetwork, expect } from '../../../../setup/vitest-helpers'

const handlers = [
  http.get('https://test.mswjs.io/reflect-url/:url', ({ params }) => {
    const { url } = params
    return HttpResponse.json({ url })
  }),
]

const test = defineTestNetwork({ handlers })

test('decodes url componets', async ({ fetch }) => {
  const url = 'http://example.com:5001/example'
  const response = await fetch(
    `https://test.mswjs.io/reflect-url/${encodeURIComponent(url)}`,
  )

  expect(response.status()).toBe(200)
  expect(response.fromServiceWorker()).toBe(true)
  expect(await response.json()).toEqual({
    url,
  })
})

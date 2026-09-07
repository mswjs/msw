import { http, HttpResponse } from 'msw'
import { defineNetwork, expect } from '../../../../setup/vitest-helpers'

const imageUrl = new URL('../../../../fixtures/image.jpg', import.meta.url)

const handlers = [
  http.get('*/images/:imageId', async () => {
    const imageBuffer = await fetch(imageUrl).then((res) => res.arrayBuffer())

    return HttpResponse.arrayBuffer(imageBuffer, {
      headers: {
        'Content-Type': 'image/jpeg',
      },
    })
  }),
]

const test = defineNetwork({ handlers })

test('responds with a given binary body', async ({ fetch }) => {
  const res = await fetch('/images/abc-123')
  const status = res.status()
  const body = await res.body()

  const expectedBuffer = await globalThis
    .fetch(new URL('../../../../fixtures/image.jpg', import.meta.url))
    .then((response) => response.arrayBuffer())

  expect(status).toBe(200)
  expect(res.fromServiceWorker()).toBe(true)
  expect(body).toEqual(new Uint8Array(expectedBuffer))
})

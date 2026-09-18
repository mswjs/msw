import { http, HttpResponse } from 'msw'
import { defineTestNetwork, expect } from '../../../../setup/vitest-helpers'

const imageUrl = new URL('../../../../fixtures/image.jpg', import.meta.url)

const handlers = [
  http.get('*/images/:imageId', async () => {
    const imageBuffer = await fetch(imageUrl).then((response) =>
      response.arrayBuffer(),
    )

    return HttpResponse.arrayBuffer(imageBuffer, {
      headers: {
        'Content-Type': 'image/jpeg',
      },
    })
  }),
]

const test = defineTestNetwork({ handlers })

test('responds with a given binary body', async ({ fetch }) => {
  const response = await fetch('/images/abc-123')
  const status = response.status()
  const body = await response.body()

  const expectedBuffer = await globalThis
    .fetch(new URL('../../../../fixtures/image.jpg', import.meta.url))
    .then((response) => response.arrayBuffer())

  expect(status).toBe(200)
  expect(response.fromServiceWorker()).toBe(true)
  expect(body).toEqual(new Uint8Array(expectedBuffer))
})

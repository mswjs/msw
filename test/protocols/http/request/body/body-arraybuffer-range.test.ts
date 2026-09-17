import { http, HttpResponse } from 'msw'
import { defineNetwork, expect } from '../../../../setup/vitest-helpers'

const buffer = new TextEncoder().encode('hello world')

const handlers = [
  http.get('*/resource', async ({ request }) => {
    const range = request.headers.get('range')

    if (!range) {
      throw new Response('Missing range', { status: 400 })
    }

    const ranges = range.replace(/bytes=/, '').split('-')
    const start = +ranges[0]
    const end = ranges[1] ? +ranges[1] : buffer.byteLength - 1
    const content = buffer.slice(start, end)

    return HttpResponse.arrayBuffer(content.buffer, {
      status: 206,
      headers: {
        'accept-range': 'bytes',
        'content-range': `bytes=${start}-${end}/${buffer.byteLength}`,
        'content-length': content.byteLength.toString(),
        'content-type': 'text/plain',
      },
    })
  }),
]

const test = defineNetwork({ handlers })

test('responds with a range of a mocked buffer response', async ({ fetch }) => {
  const response = await fetch('/resource', {
    headers: {
      range: 'bytes=4-8',
    },
  })

  expect.soft(response.status()).toBe(206)
  await expect.soft(response.text()).resolves.toBe('o wo')
})

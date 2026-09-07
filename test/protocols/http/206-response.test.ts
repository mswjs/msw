import { HttpResponse, http } from 'msw'
/**
 * @see https://github.com/mswjs/msw/issues/1972
 */
import { defineNetwork, expect } from '../../setup/vitest-helpers'

const data = 'hello world'
const buffer = new TextEncoder().encode(data)
const totalSize = buffer.byteLength

const handlers = [
  http.get('*/mocked-range', ({ request }) => {
    const range = request.headers.get('Range')

    if (!range) {
      throw HttpResponse.text('Missing Range', { status: 400 })
    }

    const ranges = range.replace(/bytes=/, '').split('-')
    const start = +ranges[0]
    const end = ranges[1] ? +ranges[1] : totalSize - 1
    const content = buffer.slice(start, end)

    return HttpResponse.arrayBuffer(content.buffer, {
      status: 206,
      headers: {
        'Accept-Range': 'bytes',
        'Content-Range': `bytes=${start}-${end}/${totalSize}`,
        'Content-Length': content.byteLength.toString(),
        'Content-Type': 'text/plain',
      },
    })
  }),
]

const test = defineNetwork({ handlers })

test('forwards the 206 response to a bypassed "Range" request', async ({
  fetch,
  testServer,
}) => {
  const response = await fetch(testServer.http.url('/range'), {
    headers: {
      Range: 'bytes=2-8',
    },
  })

  expect(response.status()).toBe(206)
  expect(response.headers()).toMatchObject({
    'accept-range': 'bytes',
    'content-range': 'bytes=2-8/11',
    'content-length': '6',
    'content-type': 'text/plain',
  })
  expect(await response.text()).toBe('llo wo')
})

test('responds with a 206 response to a mocked "Range" request', async ({
  fetch,
}) => {
  const response = await fetch('/mocked-range', {
    headers: {
      Range: 'bytes=2-8',
    },
  })

  expect(response.status()).toBe(206)
  expect(response.headers()).toMatchObject({
    'accept-range': 'bytes',
    'content-range': 'bytes=2-8/11',
    'content-length': '6',
    'content-type': 'text/plain',
  })
  expect(await response.text()).toBe('llo wo')
})

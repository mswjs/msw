/**
 * @see https://github.com/mswjs/msw/issues/1972
 */
import { HttpServer } from '@open-draft/test-server/http'
import { expect, test } from '../playwright.extend'

const encoder = new TextEncoder()

const server = new HttpServer((app) => {
  const data = 'hello world'
  const buffer = encoder.encode(data)
  const totalSize = buffer.byteLength

  app.get('/range', (req, res) => {
    const { range } = req.headers

    if (range) {
      const ranges = range.replace(/bytes=/, '').split('-')
      const start = +ranges[0]
      const end = ranges[1] ? +ranges[1] : totalSize - 1
      const content = buffer.slice(start, end)

      res.writeHead(206, {
        'Accept-Range': 'bytes',
        'Content-Range': `bytes=${start}-${end}/${totalSize}`,
        'Content-Length': content.byteLength,
        'Content-Type': 'text/plain',
      })
      return res.end(content)
    }

    res.writeHead(400)
    res.end('range missing')
  })
})

test.beforeAll(async () => {
  await server.listen()
})

test.afterAll(async () => {
  await server.close()
})

test('forwards the 206 response to a bypassed "Range" request', async ({
  loadExample,
  fetch,
}) => {
  await loadExample(require.resolve('./206-response.mocks.ts'))

  const response = await fetch(server.http.url('/range'), {
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
  loadExample,
  fetch,
}) => {
  await loadExample(require.resolve('./206-response.mocks.ts'))

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

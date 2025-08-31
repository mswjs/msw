import { http, HttpResponse } from 'msw'
import { setupWorker } from 'msw/browser'

const buffer = new TextEncoder().encode('hello world')

const worker = setupWorker(
  http.get('/resource', async ({ request }) => {
    const range = request.headers.get('range')

    if (!range) {
      throw new Response('Missing range', { status: 400 })
    }

    const ranges = range.replace(/bytes=/, '').split('-')
    const start = +ranges[0]
    const end = ranges[1] ? +ranges[1] : buffer.byteLength - 1
    const content = buffer.slice(start, end)

    return HttpResponse.arrayBuffer(content, {
      status: 206,
      headers: {
        'accept-range': 'bytes',
        'content-range': `bytes=${start}-${end}/${buffer.byteLength}`,
        'content-length': content.byteLength.toString(),
        'content-type': 'text/plain',
      },
    })
  }),
)

worker.start()

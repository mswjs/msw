import { HttpResponse, http } from 'msw'
import { setupWorker } from 'msw/browser'

const data = 'hello world'
const buffer = new TextEncoder().encode(data)
const totalSize = buffer.byteLength

const worker = setupWorker(
  http.get('/mocked-range', ({ request }) => {
    const range = request.headers.get('Range')

    if (!range) {
      throw HttpResponse.text('Missing Range', { status: 400 })
    }

    const ranges = range.replace(/bytes=/, '').split('-')
    const start = +ranges[0]
    const end = ranges[1] ? +ranges[1] : totalSize - 1
    const content = buffer.slice(start, end)

    return HttpResponse.arrayBuffer(content, {
      status: 206,
      headers: {
        'Accept-Range': 'bytes',
        'Content-Range': `bytes=${start}-${end}/${totalSize}`,
        'Content-Length': content.byteLength.toString(),
        'Content-Type': 'text/plain',
      },
    })
  }),
)

worker.start()

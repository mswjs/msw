import { http, HttpResponse } from 'msw'
import { setupWorker } from 'msw/browser'

const worker = setupWorker(
  http.get('https://test.mswjs.io/api/books', ({ request }) => {
    const url = new URL(request.url)
    const bookId = url.searchParams.get('id')

    return HttpResponse.json({ bookId })
  }),

  http.post('https://test.mswjs.io/products', ({ request }) => {
    const url = new URL(request.url)
    const productIds = url.searchParams.getAll('id')

    return HttpResponse.json({ productIds })
  }),
)

worker.start()

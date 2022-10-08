import { setupWorker, rest, HttpResponse } from 'msw'

const worker = setupWorker(
  rest.get('https://test.mswjs.io/api/books', ({ request }) => {
    const url = new URL(request.url)
    const bookId = url.searchParams.get('id')

    return HttpResponse.json({ bookId })
  }),

  rest.post('https://test.mswjs.io/products', ({ request }) => {
    const url = new URL(request.url)
    const productIds = url.searchParams.getAll('id')

    return HttpResponse.json({ productIds })
  }),
)

worker.start()

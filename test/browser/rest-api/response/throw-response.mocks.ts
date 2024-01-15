import { HttpResponse, http } from 'msw'
import { setupWorker } from 'msw/browser'

const worker = setupWorker(
  http.get('/throw/plain', () => {
    throw new Response('hello world')
  }),
  http.get('/throw/http-response', () => {
    throw HttpResponse.text('hello world')
  }),
  http.get('/throw/error', () => {
    throw HttpResponse.text('invalid input', { status: 400 })
  }),
  http.get('/throw/network-error', () => {
    throw HttpResponse.error()
  }),
  http.get('/middleware', ({ request }) => {
    const url = new URL(request.url)

    if (!url.searchParams.has('id')) {
      throw HttpResponse.text('must have id', { status: 400 })
    }

    return HttpResponse.text('ok')
  }),
  http.get('/throw/non-response-error', () => {
    throw new Error('Oops!')
  }),
)

worker.start()

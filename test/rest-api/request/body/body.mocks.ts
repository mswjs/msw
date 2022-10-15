import { setupWorker, rest, HttpResponse } from 'msw'

const worker = setupWorker(
  rest.post('/deprecated', async ({ request }) => {
    return HttpResponse.json(await request.json())
  }),
  rest.post('/text', async ({ request }) => {
    return HttpResponse.text(await request.text())
  }),
  rest.post('/json', async ({ request }) => {
    return HttpResponse.json(await request.json())
  }),
  rest.post('/arrayBuffer', async ({ request }) => {
    return HttpResponse.arrayBuffer(await request.arrayBuffer())
  }),
)

worker.start()

import { rest, HttpResponse } from 'msw'
import { setupWorker } from 'msw/browser'

const worker = setupWorker(
  rest.post('/text', async ({ request }) => {
    return HttpResponse.text(await request.text())
  }),
  rest.post('/json', async ({ request }) => {
    return HttpResponse.json(await request.json())
  }),
  rest.post('/arrayBuffer', async ({ request }) => {
    return HttpResponse.arrayBuffer(await request.arrayBuffer())
  }),
  rest.post('/formData', async ({ request }) => {
    const data = await request.formData()
    const name = data.get('name')
    const file = data.get('file') as File
    const fileText = await file.text()

    return HttpResponse.json({
      name,
      fileText,
    })
  }),
)

worker.start()

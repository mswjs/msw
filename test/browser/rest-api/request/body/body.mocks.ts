import { http, HttpResponse } from 'msw'
import { setupWorker } from 'msw/browser'

const worker = setupWorker(
  http.post('/text', async ({ request }) => {
    return HttpResponse.text(await request.text())
  }),
  http.post('/json', async ({ request }) => {
    return HttpResponse.json(await request.json())
  }),
  http.post('/arrayBuffer', async ({ request }) => {
    return HttpResponse.arrayBuffer(await request.arrayBuffer())
  }),
  http.post('/formData', async ({ request }) => {
    const data = await request.formData()
    const name = data.get('name')
    const file = data.get('file') as File
    const fileText = await file.text()
    const ids = data.get('ids') as File
    const idsJson = JSON.parse(await ids.text())

    return HttpResponse.json({
      name,
      file: fileText,
      ids: idsJson,
    })
  }),
)

worker.start()

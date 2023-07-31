import { http, HttpResponse } from 'msw'
import { setupWorker } from 'msw/browser'

const worker = setupWorker(
  http.get('/user', async () => {
    const data = new FormData()
    data.append('name', 'Alice')
    data.append('age', '32')

    return HttpResponse.formData(data)
  }),
)

worker.start()

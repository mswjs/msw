import axios from 'axios'
import { http, HttpResponse } from 'msw'
import { setupWorker } from 'msw/browser'

const worker = setupWorker(
  http.post('/upload', async ({ request }) => {
    const data = await request.formData()
    const file = data.get('file')

    if (!file) {
      return new HttpResponse('Missing document upload', { status: 400 })
    }

    if (!(file instanceof File)) {
      return new HttpResponse('Uploaded document is not a File', {
        status: 400,
      })
    }

    return HttpResponse.json({
      message: `Successfully uploaded "${file.name}"!`,
      content: await file.text(),
    })
  }),
)
worker.start()

const progressEvents = []
const request = axios.create({
  baseURL: '/',
  onDownloadProgress(event) {
    progressEvents.push(event)
  },
})

window.progressEvents = progressEvents
window.upload = async function () {
  const formData = new FormData()
  const file = new Blob(['Hello', 'world'], { type: 'text/plain' })
  formData.set('file', file, 'doc.txt')

  return request.post('/upload', formData)
}

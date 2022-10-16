import { setupWorker, rest, HttpResponse, FormData } from 'msw'

const worker = setupWorker(
  rest.get('/form-data', () => {
    const data = new FormData()
    data.set('name', 'Alice')
    data.set('age', '32')
    data.set('file', new File(['hello world'], 'file.txt'))

    return HttpResponse.formData(data, { status: 201 })
  }),
)

worker.start()

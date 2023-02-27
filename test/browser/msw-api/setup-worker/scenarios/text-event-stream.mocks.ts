import { setupWorker, rest, HttpResponse } from 'msw'

const worker = setupWorker(
  rest.get('/user', () => {
    /**
     * @todo This is not strictly synonymous to "res()"
     * as ".text()" will set the "Content-Type" header.
     */
    return HttpResponse.text()
  }),
)

worker.start()

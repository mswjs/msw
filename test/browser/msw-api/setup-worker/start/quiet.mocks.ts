import { rest, HttpResponse } from 'msw'
import { setupWorker } from 'msw/browser'

const worker = setupWorker(
  rest.get('/user', () => {
    return HttpResponse.json({
      firstName: 'John',
      age: 32,
    })
  }),
)

// @ts-ignore
window.msw = {
  registration: worker.start({
    // Disable logging of matched requests into browser's console
    quiet: true,
  }),
}

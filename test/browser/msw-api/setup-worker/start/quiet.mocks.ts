import { http, HttpResponse } from 'msw'
import { setupWorker } from 'msw/browser'

const worker = setupWorker(
  http.get('/user', () => {
    return HttpResponse.json({
      firstName: 'John',
      age: 32,
    })
  }),
)

Object.assign(window, {
  msw: {
    registration: worker.start({
      // Disable logging of matched requests into browser's console
      quiet: true,
    }),
  },
})

import { http, HttpResponse } from 'msw'
import { setupWorker } from 'msw/browser'

const worker = setupWorker(
  http.get('*/numbers', () => {
    return HttpResponse.json([1, 2, 3])
  }),
  http.get('*/letters', () => {
    return HttpResponse.json(['a', 'b', 'c'])
  }),
)

// @ts-ignore
window.init = () => {
  // By default, starting the worker defers the network requests
  // until the worker is ready to intercept them.
  worker.start({
    serviceWorker: {
      url: './worker.js',
    },
  })

  // Although this request is performed alongside an asynchronous
  // worker registration, it's being deferred by `worker.start`,
  // so it will happen only when the worker is ready.
  fetch('./numbers')

  const req = new XMLHttpRequest()
  req.open('GET', './letters')
  req.send()
}

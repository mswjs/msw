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
  worker.start({
    serviceWorker: {
      url: './worker.js',
    },
    waitUntilReady: false,
  })

  // Without deferring the network requests until the worker is ready,
  // there is a race condition between the worker's registration and
  // any runtime requests that may happen meanwhile.
  fetch('./numbers')

  const req = new XMLHttpRequest()
  req.open('GET', './letters')
  req.send()
}

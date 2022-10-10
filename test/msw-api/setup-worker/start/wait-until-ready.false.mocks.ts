import { setupWorker, rest, HttpResponse } from 'msw'

const worker = setupWorker(
  rest.get('/numbers', () => {
    return HttpResponse.json([1, 2, 3])
  }),
  rest.get('/letters', () => {
    return HttpResponse.json(['a', 'b', 'c'])
  }),
)

worker.start({
  serviceWorker: {
    url: '/worker.js',
  },
  waitUntilReady: false,
})

// Without deferring the network requests until the worker is ready,
// there is a race condition between the worker's registration and
// any runtime requests that may happen meanwhile.
fetch('/numbers')

const req = new XMLHttpRequest()
req.open('GET', '/letters')
req.send()

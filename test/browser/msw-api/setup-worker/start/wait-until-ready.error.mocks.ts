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

Object.assign(window, {
  init: () => {
    worker.start({
      // Force an exception during Service Worker registration.
      // @ts-expect-error Providing invalid option value.
      serviceWorker: 'invalid-value',
    })

    fetch('./numbers')

    const req = new XMLHttpRequest()
    req.open('GET', './letters')
    req.send()
  },
})

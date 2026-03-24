import { http, HttpResponse } from 'msw'
import { setupWorker } from 'msw/browser'

let keepaliveRequests = 0

const originalSetInterval = window.setInterval.bind(window)
window.setInterval = ((handler, timeout, ...args) => {
  const nextTimeout = timeout === 5000 ? 50 : timeout
  return originalSetInterval(handler, nextTimeout, ...args)
}) as typeof window.setInterval

ServiceWorker.prototype.postMessage = new Proxy(
  ServiceWorker.prototype.postMessage as (...args: Array<any>) => void,
  {
    apply(target, thisArg, args) {
      if (args[0] === 'KEEPALIVE_REQUEST') {
        keepaliveRequests += 1
      }

      return Reflect.apply(target, thisArg, args)
    },
  },
) as ServiceWorker['postMessage']

const worker = setupWorker(
  http.get('/resource', () => {
    return HttpResponse.json({ mocked: true })
  }),
)

worker.start()

Object.assign(window, {
  msw: {
    worker,
    getKeepaliveRequests() {
      return keepaliveRequests
    },
  },
})

import * as R from 'ramda'
import parseRoute from './utils/parseRoutes'
import createRes, { ResponseMock } from './createRes'

enum RESTMethod {
  get = 'get',
  post = 'post',
  put = 'put',
  delete = 'delete',
}

type Handler = (req: Request, res: ResponseMock) => void
interface Routes {
  [method: string] : {
    [route: string]: Handler
  }
}

const serviceWorkerPath = '/mockServiceWorker.js'

export default class MockServiceWorker {
  worker: ServiceWorker
  serviceWorkerRegistration: ServiceWorkerRegistration
  routes: Routes

  constructor() {
    /** @todo Consider removing event listeners upon destruction? */
    navigator.serviceWorker.addEventListener('message', this.interceptRequest)
    window.addEventListener('beforeunload', () => {
      /**
       * Post a message before window unloads to prevent the active worker
       * to intercept the outgoing requests. When the page loads, the resources
       * fetched (including the client JavaScript) are going to undergo through
       * the mock. Since client hasn't been downloaded and run yet, it won't be
       * able to reply pack when worker prompts to receive the mock.
       */
      if (this.worker && this.worker.state !== 'redundant') {
        this.worker.postMessage('mock-deactivate')
      }
    })

    return this
  }

  interceptRequest = (event) => {
    const req = JSON.parse(event.data)
    const { method, url } = req
    const relevantRoutes = this.routes[method.toLowerCase()] || {}
    const relevantRoute = Object.keys(relevantRoutes)
      .reduce((acc, mask) => {
        const parsedRoute = parseRoute(mask, url)
        return parsedRoute.matches
          ? {
            handler: relevantRoutes[mask],
            parsedRoute,
          }
          : acc
      },
      null
    )

    if (relevantRoute === null) {
      return this.postMessage(event, 'not-found')
    }

    const { handler, parsedRoute } = relevantRoute
    const res = createRes()
    handler({ ...req, params: parsedRoute.params }, res)

    return this.postMessage(event, JSON.stringify(res))
  }

  /**
   * Posts a message to the active ServiceWorker.
   */
  postMessage(event, message: any) {
    event.ports[0].postMessage(message)
  }

  start(): Promise<ServiceWorkerRegistration | void> {
    if (this.serviceWorkerRegistration) {
      return this.serviceWorkerRegistration.update()
    }

    if (!('serviceWorker' in navigator)) {
      console.error('Failed to start MockServiceWorker: Your current browser does not support Service Workers.')
      return void(null)
    }

    navigator.serviceWorker.register(serviceWorkerPath, { scope: '/' })
      .then((reg) => {
        const workerInstance = reg.active || reg.installing || reg.waiting

        workerInstance.postMessage('mock-activate')
        this.worker = workerInstance
        this.serviceWorkerRegistration = reg

        return reg
      })
      .catch(console.error)
  }

  stop() {
    if (!this.serviceWorkerRegistration) {
      return console.warn('No active instane of Service Worker is active.')
    }

    this.serviceWorkerRegistration.unregister().then(() => {
      this.worker = null
      this.serviceWorkerRegistration = null
    })
  }

  addRoute = R.curry((method: RESTMethod, route:string, handler: Handler) => {
    this.routes = R.assocPath([method, route], handler, this.routes)
    return this
  })

  get = this.addRoute(RESTMethod.get)
  post = this.addRoute(RESTMethod.post)
  put = this.addRoute(RESTMethod.put)
  delete = this.addRoute(RESTMethod.delete)
}

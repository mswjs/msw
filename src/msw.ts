import * as R from 'ramda'
import serialize from './utils/serialize'
import parseRoute from './utils/parseRoutes'

type Method = 'get' | 'post' | 'put' | 'delete'
type Handler = (req: Request, res: {}) => any
interface Routes {
  [method: string] : {
    [route: string]: Handler
  }
}

const headers = new Headers()
headers.set('Mocked', 'true')

const createRes = () => ({
  headers,
  body: null,
  statusCode: 200,
  statusText: 'OK',
  timeout: 0,
  set(name, value) {
    if (typeof name === 'object') {
      Object.keys(name).forEach((headerName) => {
        this.headers.set(headerName, name[headerName])
      })
      return this
    }

    this.headers.set(name, value)
    return this
  },
  status(statusCode, statusText) {
    this.statusCode = statusCode
    this.statusText = statusText
    return this
  },
  json(body) {
    this.body = JSON.stringify(body)
    this.headers.set('Content-Type', 'application/json')
    return this
  },
  delay(duration) {
    this.timeout = duration
    return this
  }
})
//

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
    const relevantRoutes = this.routes[method.toLowerCase()]

    const relevantRoute = Object.keys(relevantRoutes).reduce((acc, mask) => {
      const parsedRoute = parseRoute(mask, url)

      if (parsedRoute.matches) {
        return {
          handler: relevantRoutes[mask],
          parsedRoute,
        }
      }

      return acc
    }, null)

    if (relevantRoute === null) {
      return event.ports[0].postMessage('not-found')
    }

    const { handler, params } = relevantRoute
    const res = createRes()
    handler({ ...req, params }, res)

    return event.ports[0].postMessage(JSON.stringify(res))
  }

  start(): Promise<ServiceWorkerRegistration | void> {
    if (this.serviceWorkerRegistration) {
      return this.serviceWorkerRegistration.update()
    }

    return navigator.serviceWorker.register(serviceWorkerPath, { scope: '/' })
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

    return this.serviceWorkerRegistration.unregister()
  }

  addRoute = R.curry((method: Method, route:string, handler: Handler) => {
    this.routes = R.assocPath([method, route], handler, this.routes)
    return this
  })

  /**
   * Route declaration aliases.
   * @example
   * msw.get('https://backend.dev/user/:username', (req, res) => {
   *  return res.status(200).json({ username: req.params.username })
   * })
   */
  get = this.addRoute('get')
  post = this.addRoute('post')
  put = this.addRoute('put')
  delete = this.addRoute('delete')
}

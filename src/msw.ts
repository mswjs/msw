import * as R from 'ramda'
import assertUrl, { Mask, ParsedUrl } from './utils/assertUrl'
import res, { MockedResponse, ResponseComposition } from './response'
import context, { MockedContext } from './context'

export enum RESTMethod {
  GET = 'GET',
  POST = 'POST',
  PUT = 'PUT',
  PATCH = 'PATCH',
  OPTIONS = 'OPTIONS',
  DELETE = 'DELETE',
}

type Handler = (
  req: Request,
  res: ResponseComposition,
  context: MockedContext,
) => MockedResponse

type Routes = Record<RESTMethod, { [route: string]: Handler }>

const serviceWorkerPath = '/mockServiceWorker.js'

export class MockServiceWorker {
  worker: ServiceWorker
  workerRegistration: ServiceWorkerRegistration
  routes: Routes

  constructor() {
    if (!('serviceWorker' in navigator)) {
      console.error(
        'Failed to instantiate MockServiceWorker: Your current environment does not support Service Workers.',
      )
      return null
    }

    /** @todo Consider removing event listeners upon destruction */
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

    if (typeof window !== 'undefined') {
      ;(window as any).msw = this
    }

    return this
  }

  interceptRequest = (event) => {
    const req = JSON.parse(event.data)
    const relevantRoutes = this.routes[req.method.toLowerCase()] || {}
    const parsedRoute = Object.keys(relevantRoutes).reduce<ParsedUrl>(
      (acc, mask) => {
        const parsedRoute = assertUrl(mask, req.url)
        return parsedRoute.matches ? parsedRoute : acc
      },
      null,
    )

    if (parsedRoute === null) {
      return this.postMessage(event, 'not-found')
    }

    const handler = relevantRoutes[parsedRoute.mask as string]
    const resolvedResponse =
      handler({ ...req, params: parsedRoute.params }, res, context) || {}

    resolvedResponse.headers = R.fromPairs(
      Array.from(resolvedResponse.headers.entries()),
    )

    if (!resolvedResponse) {
      console.warn(
        'Expected a mocking handler function to return an Object, but got: %s. ',
        resolvedResponse,
      )
    }

    this.postMessage(event, JSON.stringify(resolvedResponse))
  }

  /**
   * Posts a message to the active ServiceWorker.
   * Uses a port of the message channel created in the ServiceWorker.
   */
  postMessage(event, message: any) {
    event.ports[0].postMessage(message)
  }

  start(): Promise<ServiceWorkerRegistration | void> {
    if (this.workerRegistration) {
      return this.workerRegistration.update()
    }

    navigator.serviceWorker
      .register(serviceWorkerPath, { scope: '/' })
      .then((reg) => {
        const workerInstance = reg.active || reg.installing || reg.waiting

        workerInstance.postMessage('mock-activate')
        this.worker = workerInstance
        this.workerRegistration = reg

        return reg
      })
      .catch(console.error)
  }

  stop() {
    if (!this.workerRegistration) {
      return console.warn('No active instance of Service Worker is running.')
    }

    this.workerRegistration.unregister().then(() => {
      this.worker = null
      this.workerRegistration = null
    })
  }

  addRoute = R.curry((method: RESTMethod, mask: Mask, handler: Handler) => {
    const resolvedMask =
      (mask as any) instanceof RegExp ? `__REGEXP__${mask}` : mask

    this.routes = R.assocPath(
      [method.toLowerCase(), resolvedMask],
      handler,
      this.routes,
    )
    return this
  })

  get = this.addRoute(RESTMethod.GET)
  post = this.addRoute(RESTMethod.POST)
  put = this.addRoute(RESTMethod.PUT)
  patch = this.addRoute(RESTMethod.PATCH)
  options = this.addRoute(RESTMethod.OPTIONS)
  delete = this.addRoute(RESTMethod.DELETE)
}

export default new MockServiceWorker()

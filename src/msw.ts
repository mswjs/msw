import * as R from 'ramda'
import assertUrl, { Mask, ParsedUrl } from './utils/assertUrl'
import res, { MockedResponse, ResponseComposition } from './response'
import context, { MockedContext } from './context'

enum RESTMethod {
  get = 'get',
  post = 'post',
  put = 'put',
  patch = 'patch',
  options = 'options',
  delete = 'delete',
}

type Handler = (
  req: Request,
  res: ResponseComposition,
  context: MockedContext,
) => MockedResponse

interface Routes {
  [method: string]: {
    [route: string]: Handler
  }
}

const serviceWorkerPath = '/mockServiceWorker.js'

export default class MockServiceWorker {
  worker: ServiceWorker
  workerRegistration: ServiceWorkerRegistration
  routes: Routes

  constructor() {
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

    if (!resolvedResponse) {
      console.warn(
        'Expected a mocking handler function to return an Object, but got: %s. ',
        resolvedResponse,
      )
    }

    return this.postMessage(event, JSON.stringify(resolvedResponse))
  }

  /**
   * Posts a message to the active ServiceWorker.
   */
  postMessage(event, message: any) {
    event.ports[0].postMessage(message)
  }

  start(): Promise<ServiceWorkerRegistration | void> {
    if (this.workerRegistration) {
      return this.workerRegistration.update()
    }

    if (!('serviceWorker' in navigator)) {
      console.error(
        'Failed to start MockServiceWorker: Your current browser does not support Service Workers.',
      )
      return void null
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
    this.routes = R.assocPath([method, mask as string], handler, this.routes)
    return this
  })

  get = this.addRoute(RESTMethod.get)
  post = this.addRoute(RESTMethod.post)
  put = this.addRoute(RESTMethod.put)
  patch = this.addRoute(RESTMethod.patch)
  options = this.addRoute(RESTMethod.options)
  delete = this.addRoute(RESTMethod.delete)
}

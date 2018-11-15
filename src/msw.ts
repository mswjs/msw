import * as R from 'ramda'
import serialize from './utils/serialize'

type Method = 'get' | 'post' | 'put' | 'delete'
type Handler = (req: Request, res: Response) => any
interface Routes {
  [method: string] : {
    [route: string]: Handler
  }
}

export default class MockServiceWorker {
  serviceWorkerPath: string = '/serviceWorker.js'
  instance: ServiceWorkerRegistration
  routes: Routes

  start(): Promise<ServiceWorkerRegistration | void> {
    return navigator.serviceWorker.register(this.serviceWorkerPath, { scope: '/' })
      .then((reg) => {
        const workerInstance = reg.active || reg.installing || reg.waiting
        const serializedRoutes = serialize(this.routes)
      
        workerInstance.postMessage({
          type: 'initRoutes',
          routes: serializedRoutes
        })

        this.instance = reg
        return reg
      })
      .catch(console.error)
  }

  stop() {
    if (!this.instance) {
      return console.warn('No active instane of Service Worker is active.')
    }

    return this.instance.unregister()
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

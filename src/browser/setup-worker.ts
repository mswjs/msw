import {
  HttpHandler,
  LifeCycleEventsMap,
  SetupApi,
  WebSocketHandler,
} from '~/core'
import { ServiceWorkerSource } from './service-worker-source'
import { isHandlerKind } from '~/core/utils/internal/isHandlerKind'

export function setupWorker(
  ...handlers: Array<HttpHandler | WebSocketHandler>
) {
  return defineNetwork({
    sources: [new ServiceWorkerSource()],
    handlers,
  })
}

// Setup APIs themselves only provision the request handler matching.
// They establish the network sources they need, then listen to the
// network frames, then route them through handlers and respond back
// to the network source.
export class SetupWorker extends SetupApi<LifeCycleEventsMap> {
  #source: ServiceWorkerSource

  constructor(handlers: Array<HttpHandler | WebSocketHandler>) {
    super(handlers)

    this.#source = null as any
  }

  public async start() {
    this.#source = new ServiceWorkerSource({
      serviceWorker: {
        url: '/mockServiceWorker.js',
      },
    })

    await this.#source.enable()
    this.subscriptions.push(() => this.#source.disable())

    this.#source.on('http', (event) => {
      const requestHandlers = this.handlersController
        .currentHandlers()
        .filter(isHandlerKind('RequestHandler'))

      // 1. Pass the frame through all handlers.
      // 2. Each handler decides if it's suitable to handle this frame.
      // 3. Get the result for the frame, if any.
    })
  }

  public stop() {
    this.dispose()
  }
}

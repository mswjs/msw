import { AsyncLocalStorage } from 'node:async_hooks'
import { ClientRequestInterceptor } from '@mswjs/interceptors/ClientRequest'
import { XMLHttpRequestInterceptor } from '@mswjs/interceptors/XMLHttpRequest'
import { FetchInterceptor } from '@mswjs/interceptors/fetch'
import { HandlersController } from '~/core/SetupApi'
import type { RequestHandler } from '~/core/handlers/RequestHandler'
import type { SetupServer } from './glossary'
import { SetupServerCommonApi } from './SetupServerCommonApi'
import { Socket } from 'socket.io-client'
import { SyncServerEventsMap, createSyncClient } from './setupRemoteServer'
import { RemoteRequestHandler } from '~/core/handlers/RemoteRequestHandler'
import {
  onAnyEvent,
  serializeEventPayload,
} from '~/core/utils/internal/emitterUtils'

const store = new AsyncLocalStorage<RequestHandlersContext>()

type RequestHandlersContext = {
  initialHandlers: Array<RequestHandler>
  handlers: Array<RequestHandler>
}

/**
 * A handlers controller that utilizes `AsyncLocalStorage` in Node.js
 * to prevent the request handlers list from being a shared state
 * across mutliple tests.
 */
class AsyncHandlersController implements HandlersController {
  private rootContext: RequestHandlersContext

  constructor(initialHandlers: Array<RequestHandler>) {
    this.rootContext = { initialHandlers, handlers: [] }
  }

  get context(): RequestHandlersContext {
    return store.getStore() || this.rootContext
  }

  public prepend(runtimeHandlers: Array<RequestHandler>) {
    this.context.handlers.unshift(...runtimeHandlers)
  }

  public reset(nextHandlers: Array<RequestHandler>) {
    const context = this.context
    context.handlers = []
    context.initialHandlers =
      nextHandlers.length > 0 ? nextHandlers : context.initialHandlers
  }

  public currentHandlers(): Array<RequestHandler> {
    const { initialHandlers, handlers } = this.context
    return handlers.concat(initialHandlers)
  }
}

export class SetupServerApi
  extends SetupServerCommonApi
  implements SetupServer
{
  private socket?: Socket<SyncServerEventsMap>

  constructor(handlers: Array<RequestHandler>) {
    super(
      [ClientRequestInterceptor, XMLHttpRequestInterceptor, FetchInterceptor],
      handlers,
    )

    this.handlersController = new AsyncHandlersController(handlers)
    this.initRemoteServer()
  }

  public boundary<Fn extends (...args: Array<any>) => unknown>(
    callback: Fn,
  ): (...args: Parameters<Fn>) => ReturnType<Fn> {
    return (...args: Parameters<Fn>): ReturnType<Fn> => {
      return store.run<any, any>(
        {
          initialHandlers: this.handlersController.currentHandlers(),
          handlers: [],
        },
        callback,
        ...args,
      )
    }
  }

  public close(): void {
    super.close()
    store.disable()
  }

  private async initRemoteServer() {
    const { remotePort } = this.resolvedOptions

    if (remotePort == null) {
      return
    }

    const { socket } = this

    if (typeof socket === 'undefined') {
      this.socket = await createSyncClient(remotePort)
    } else {
      this.handlersController.currentHandlers = new Proxy(
        this.handlersController.currentHandlers,
        {
          get: (target, property, value) => {
            const handlers = Reflect.get(
              target,
              property,
              value,
            ) as Array<RequestHandler>

            return Array.prototype.concat(
              new RemoteRequestHandler({
                socket,
              }),
              handlers,
            )
          },
        },
      )
    }

    onAnyEvent(this.emitter, async (eventName, listenerArgs) => {
      const { socket } = this
      const { request } = listenerArgs

      if (socket) {
        const forwardLifeCycleEvent = async () => {
          const args = await serializeEventPayload(listenerArgs)
          socket.emit(
            'lifeCycleEventForward',
            /**
             * @todo Annotating serialized/desirialized mirror channels is tough.
             */
            eventName,
            args as any,
          )
        }

        if (request.headers.get('x-msw-request-type') !== 'internal-request') {
          forwardLifeCycleEvent()
        }
      }
    })
  }
}

import {
  SetupWorkerInternalContext,
  RequestHandlersList,
  SetupWorkerApi,
  ServiceWorkerIncomingEventsMap,
} from './glossary'
import { createStart } from './start/createStart'
import { createStop } from './stop/createStop'
import * as requestHandlerUtils from '../utils/handlers/requestHandlerUtils'
import { isNodeProcess } from '../utils/internal/isNodeProcess'
import { StrictEventEmitter } from '../utils/lifecycle/StrictEventEmitter'
import { ServiceWorkerMessage } from '../utils/createBroadcastChannel'

interface Listener {
  target: EventTarget
  event: string
  callback: EventListener
}

// Declare the list of event handlers on the module's scope
// so it persists between Fash refreshes of the application's code.
let listeners: Listener[] = []

/**
 * Creates a new mock Service Worker registration
 * with the given request handlers.
 * @param {RequestHandler[]} requestHandlers List of request handlers
 * @see {@link https://mswjs.io/docs/api/setup-worker `setupWorker`}
 */
export function setupWorker(
  ...requestHandlers: RequestHandlersList
): SetupWorkerApi {
  requestHandlers.forEach((handler) => {
    if (Array.isArray(handler))
      throw new Error(
        `[MSW] Failed to call "setupWorker" given an Array of request handlers (setupWorker([a, b])), expected to receive each handler individually: setupWorker(a, b).`,
      )
  })
  const context: SetupWorkerInternalContext = {
    worker: null,
    registration: null,
    requestHandlers: [...requestHandlers],
    emitter: new StrictEventEmitter(),
    events: {
      addListener(target: EventTarget, event: string, callback: EventListener) {
        target.addEventListener(event, callback)
        listeners.push({ event, target, callback })

        return () => {
          target.removeEventListener(event, callback)
        }
      },
      removeAllListeners() {
        for (const { target, event, callback } of listeners) {
          target.removeEventListener(event, callback)
        }
        listeners = []
      },
      once(type) {
        const bindings: Array<() => void> = []

        return new Promise<
          ServiceWorkerMessage<
            typeof type,
            ServiceWorkerIncomingEventsMap[typeof type]
          >
        >((resolve, reject) => {
          const handleIncomingMessage = (event: MessageEvent) => {
            try {
              const message = JSON.parse(event.data)

              if (message.type === type) {
                resolve(message)
              }
            } catch (error) {
              reject(error)
            }
          }

          bindings.push(
            context.events.addListener(
              navigator.serviceWorker,
              'message',
              handleIncomingMessage,
            ),
            context.events.addListener(
              navigator.serviceWorker,
              'messageerror',
              reject,
            ),
          )
        }).finally(() => {
          bindings.forEach((unbind) => unbind())
        })
      },
    },
  }

  // Error when attempting to run this function in a NodeJS environment.
  if (isNodeProcess()) {
    throw new Error(
      '[MSW] Failed to execute `setupWorker` in a non-browser environment. Consider using `setupServer` for NodeJS environment instead.',
    )
  }

  return {
    start: createStart(context),
    stop: createStop(context),

    use(...handlers) {
      requestHandlerUtils.use(context.requestHandlers, ...handlers)
    },

    restoreHandlers() {
      requestHandlerUtils.restoreHandlers(context.requestHandlers)
    },

    resetHandlers(...nextHandlers) {
      context.requestHandlers = requestHandlerUtils.resetHandlers(
        requestHandlers,
        ...nextHandlers,
      )
    },

    printHandlers() {
      context.requestHandlers.forEach((handler) => {
        const meta = handler.getMetaInfo()

        console.groupCollapsed(meta.header)
        console.log(`Declaration: ${meta.callFrame}`)
        console.log('Resolver: %s', handler.resolver)
        if (['rest'].includes(meta.type)) {
          console.log('Match:', `https://mswjs.io/repl?path=${meta.mask}`)
        }
        console.groupEnd()
      })
    },

    on(eventType, listener): void {
      context.emitter.addEventListener(eventType, listener)
    },
  }
}

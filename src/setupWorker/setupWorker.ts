import {
  SetupWorkerInternalContext,
  RequestHandlersList,
  SetupWorkerApi,
} from './glossary'
import { createStart } from './start/createStart'
import { createStop } from './stop/createStop'
import * as requestHandlerUtils from '../utils/handlers/requestHandlerUtils'
import { isNodeProcess } from '../utils/internal/isNodeProcess'
import { ServiceWorkerMessage } from '../utils/createBroadcastChannel'

interface Listener {
  target: EventTarget
  event: string
  callback: EventListener
}

// Declare the list of event handlers on the module's scope
// so it persists between Fash refreshes of the application's code.
let listeners: Listener[] = []

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
      once<T>(type: string) {
        const bindings: Array<() => void> = []

        return new Promise<ServiceWorkerMessage<T>>((resolve, reject) => {
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

    list() {
      context.requestHandlers.forEach((handler) => {
        const meta = handler.getMetaInfo()

        console.groupCollapsed(meta.header)
        console.log(`Declaration: ${meta.callFrame}`)
        console.log('Resolver: %s', handler.resolver)
        console.groupEnd()
      })
    },
  }
}

import { StrictEventEmitter } from 'strict-event-emitter'
import {
  SetupWorkerInternalContext,
  SetupWorkerApi,
  ServiceWorkerIncomingEventsMap,
} from './glossary'
import { createStart } from './start/createStart'
import { createStop } from './stop/createStop'
import * as requestHandlerUtils from '../utils/internal/requestHandlerUtils'
import { isNodeProcess } from '../utils/internal/isNodeProcess'
import { ServiceWorkerMessage } from '../utils/createBroadcastChannel'
import { jsonParse } from '../utils/internal/jsonParse'
import { RequestHandler } from '../handlers/RequestHandler'
import { RestHandler } from '../handlers/RestHandler'

interface Listener {
  target: EventTarget
  eventType: string
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
  ...requestHandlers: RequestHandler[]
): SetupWorkerApi {
  requestHandlers.forEach((handler) => {
    if (Array.isArray(handler))
      throw new Error(
        `[MSW] Failed to call "setupWorker" given an Array of request handlers (setupWorker([a, b])), expected to receive each handler individually: setupWorker(a, b).`,
      )
  })
  const context: SetupWorkerInternalContext = {
    startOptions: undefined,
    worker: null,
    registration: null,
    requestHandlers: [...requestHandlers],
    emitter: new StrictEventEmitter(),
    workerChannel: {
      on(eventType, callback) {
        context.events.addListener(
          navigator.serviceWorker,
          'message',
          (event: MessageEvent) => {
            // Avoid messages broadcasted from unrelated workers.
            if (event.source !== context.worker) {
              return
            }

            const message = jsonParse<
              ServiceWorkerMessage<typeof eventType, any>
            >(event.data)

            if (!message) {
              return
            }

            if (message.type === eventType) {
              callback(event, message)
            }
          },
        )
      },
      send(type) {
        context.worker?.postMessage(type)
      },
    },
    events: {
      addListener(
        target: EventTarget,
        eventType: string,
        callback: EventListener,
      ) {
        target.addEventListener(eventType, callback)
        listeners.push({ eventType, target, callback })

        return () => {
          target.removeEventListener(eventType, callback)
        }
      },
      removeAllListeners() {
        for (const { target, eventType, callback } of listeners) {
          target.removeEventListener(eventType, callback)
        }
        listeners = []
      },
      once(eventType) {
        const bindings: Array<() => void> = []

        return new Promise<
          ServiceWorkerMessage<
            typeof eventType,
            ServiceWorkerIncomingEventsMap[typeof eventType]
          >
        >((resolve, reject) => {
          const handleIncomingMessage = (event: MessageEvent) => {
            try {
              const message = JSON.parse(event.data)

              if (message.type === eventType) {
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

  // Error when attempting to run this function in a Node.js environment.
  if (isNodeProcess()) {
    throw new Error(
      '[MSW] Failed to execute `setupWorker` in a non-browser environment. Consider using `setupServer` for Node.js environment instead.',
    )
  }

  return {
    start: createStart(context),
    stop: createStop(context),

    use(...handlers) {
      console.log('adding new handlers', handlers)
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
        const { header, callFrame } = handler.info
        const pragma = handler.info.hasOwnProperty('operationType')
          ? '[graphql]'
          : '[rest]'

        console.groupCollapsed(`${pragma} ${header}`)

        if (callFrame) {
          console.log(`Declaration: ${callFrame}`)
        }

        console.log('Handler:', handler)

        if (handler instanceof RestHandler) {
          console.log(
            'Match:',
            `https://mswjs.io/repl?path=${handler.info.mask}`,
          )
        }

        console.groupEnd()
      })
    },

    on(eventType, listener) {
      context.emitter.addListener(eventType, listener)
    },
  }
}

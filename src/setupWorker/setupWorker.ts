import { isNodeProcess } from 'is-node-process'
import { StrictEventEmitter } from 'strict-event-emitter'
import {
  SetupWorkerInternalContext,
  SetupWorkerApi,
  ServiceWorkerIncomingEventsMap,
} from './glossary'
import { createStartHandler } from './start/createStartHandler'
import { createStop } from './stop/createStop'
import * as requestHandlerUtils from '../utils/internal/requestHandlerUtils'
import { ServiceWorkerMessage } from './start/utils/createMessageChannel'
import { RequestHandler } from '../handlers/RequestHandler'
import { RestHandler } from '../handlers/RestHandler'
import { prepareStartHandler } from './start/utils/prepareStartHandler'
import { createFallbackStart } from './start/createFallbackStart'
import { createFallbackStop } from './stop/createFallbackStop'
import { devUtils } from '../utils/internal/devUtils'
import { pipeEvents } from '../utils/internal/pipeEvents'
import { toReadonlyArray } from '../utils/internal/toReadonlyArray'
import { LifeCycleEventsMap } from '../sharedOptions'

interface Listener {
  target: EventTarget
  eventType: string
  callback: EventListener
}

// Declare the list of event handlers on the module's scope
// so it persists between Fash refreshes of the application's code.
let listeners: Array<Listener> = []

/**
 * Creates a new mock Service Worker registration
 * with the given request handlers.
 * @param {RequestHandler[]} requestHandlers List of request handlers
 * @see {@link https://mswjs.io/docs/api/setup-worker `setupWorker`}
 */
export function setupWorker(
  ...requestHandlers: Array<RequestHandler>
): SetupWorkerApi {
  requestHandlers.forEach((handler) => {
    if (Array.isArray(handler))
      throw new Error(
        devUtils.formatMessage(
          'Failed to call "setupWorker" given an Array of request handlers (setupWorker([a, b])), expected to receive each handler individually: setupWorker(a, b).',
        ),
      )
  })

  // Error when attempting to run this function in a Node.js environment.
  if (isNodeProcess()) {
    throw new Error(
      devUtils.formatMessage(
        'Failed to execute `setupWorker` in a non-browser environment. Consider using `setupServer` for Node.js environment instead.',
      ),
    )
  }

  const emitter = new StrictEventEmitter<LifeCycleEventsMap>()
  const publicEmitter = new StrictEventEmitter<LifeCycleEventsMap>()
  pipeEvents(emitter, publicEmitter)

  const context: SetupWorkerInternalContext = {
    // Mocking is not considered enabled until the worker
    // signals back the successful activation event.
    isMockingEnabled: false,
    startOptions: undefined,
    worker: null,
    registration: null,
    requestHandlers: [...requestHandlers],
    emitter,
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

            const message = event.data as ServiceWorkerMessage<
              typeof eventType,
              any
            >

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
              const message = event.data

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
    useFallbackMode:
      !('serviceWorker' in navigator) || location.protocol === 'file:',
  }

  const startHandler = context.useFallbackMode
    ? createFallbackStart(context)
    : createStartHandler(context)
  const stopHandler = context.useFallbackMode
    ? createFallbackStop(context)
    : createStop(context)

  return {
    start: prepareStartHandler(startHandler, context),
    stop() {
      context.events.removeAllListeners()
      context.emitter.removeAllListeners()
      publicEmitter.removeAllListeners()
      stopHandler()
    },

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

    listHandlers() {
      return toReadonlyArray(context.requestHandlers)
    },

    printHandlers() {
      const handlers = this.listHandlers()

      handlers.forEach((handler) => {
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
            `https://mswjs.io/repl?path=${handler.info.path}`,
          )
        }

        console.groupEnd()
      })
    },

    events: {
      on(...args) {
        return publicEmitter.on(...args)
      },
      removeListener(...args) {
        return publicEmitter.removeListener(...args)
      },
      removeAllListeners(...args) {
        return publicEmitter.removeAllListeners(...args)
      },
    },
  }
}

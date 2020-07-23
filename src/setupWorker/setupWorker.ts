import { SetupWorkerInternalContext, RequestHandlersList } from './glossary'
import { createStart } from './start/createStart'
import { createStop } from './stop/createStop'
import * as requestHandlerUtils from '../utils/requestHandlerUtils'
import { isNodeProcess } from '../utils/isNodeProcess'
import { ServiceWorkerMessage } from '../utils/createBroadcastChannel'

export interface SetupWorkerApi {
  start: ReturnType<typeof createStart>
  stop: ReturnType<typeof createStop>

  /**
   * Prepends given request handlers to the list of existing handlers.
   */
  use: (...handlers: RequestHandlersList) => void

  /**
   * Marks all request handlers that respond using `res.once()` as unused.
   */
  restoreHandlers: () => void

  /**
   * Resets request handlers to the initial list given to the `setupWorker` call, or to the explicit next request handlers list, if given.
   */
  resetHandlers: (...nextHandlers: RequestHandlersList) => void
}

/**
 * Configures a Service Worker with the given request handler functions.
 */

interface Listener {
  target: EventTarget
  type: string
  callback: EventListener
}

export function setupWorker(
  ...requestHandlers: RequestHandlersList
): SetupWorkerApi {
  let listeners: Listener[] = []

  const context: SetupWorkerInternalContext = {
    worker: null,
    registration: null,
    requestHandlers: [...requestHandlers],
    addEventListener(
      target: EventTarget,
      type: string,
      callback: EventListener,
    ) {
      target.addEventListener(type, callback)
      listeners.push({ type, target, callback })
    },
    removeAllEventListeners() {
      for (const { target, type, callback } of listeners) {
        target.removeEventListener(type, callback)
      }
      listeners = []
    },

    once<T>(type: string) {
      const bindings: Array<() => void> = []

      return new Promise<ServiceWorkerMessage<T>>((resolve, reject) => {
        const dispatchMessage = (event: MessageEvent) => {
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
          () =>
            navigator.serviceWorker.removeEventListener(
              'message',
              dispatchMessage,
            ),
          () =>
            navigator.serviceWorker.removeEventListener('messageerror', reject),
        )

        context.addEventListener(
          navigator.serviceWorker,
          'message',
          dispatchMessage,
        )
        context.addEventListener(
          navigator.serviceWorker,
          'messageerror',
          reject,
        )
      }).finally(() => bindings.forEach((unbind) => unbind()))
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
  }
}

import { invariant } from 'outvariant'
import { isNodeProcess } from 'is-node-process'
import {
  SetupWorkerInternalContext,
  ServiceWorkerIncomingEventsMap,
  StartReturnType,
  StopHandler,
  StartHandler,
  StartOptions,
} from './glossary'
import { createStartHandler } from './start/createStartHandler'
import { createStop } from './stop/createStop'
import { ServiceWorkerMessage } from './start/utils/createMessageChannel'
import { RequestHandler } from '../handlers/RequestHandler'
import { DEFAULT_START_OPTIONS } from './start/utils/prepareStartHandler'
import { createFallbackStart } from './start/createFallbackStart'
import { createFallbackStop } from './stop/createFallbackStop'
import { devUtils } from '../utils/internal/devUtils'
import { SetupApi } from '../SetupApi'
import { mergeRight } from '../utils/internal/mergeRight'
import { LifeCycleEventsMap } from '../sharedOptions'
import { SetupWorkerApi as SetupWorker } from './glossary'

interface Listener {
  target: EventTarget
  eventType: string
  callback: EventListenerOrEventListenerObject
}

class SetupWorkerApi
  extends SetupApi<LifeCycleEventsMap>
  implements SetupWorker
{
  private context: SetupWorkerInternalContext
  private startHandler: StartHandler = null as any
  private stopHandler: StopHandler = null as any
  private listeners: Array<Listener>

  constructor(...handlers: Array<RequestHandler>) {
    super(...handlers)

    invariant(
      !isNodeProcess(),
      devUtils.formatMessage(
        'Failed to execute `setupWorker` in a non-browser environment. Consider using `setupServer` for Node.js environment instead.',
      ),
    )

    this.listeners = []
    this.context = this.createWorkerContext()
  }

  private createWorkerContext(): SetupWorkerInternalContext {
    const context: SetupWorkerInternalContext = {
      // Mocking is not considered enabled until the worker
      // signals back the successful activation event.
      isMockingEnabled: false,
      startOptions: null as any,
      worker: null,
      registration: null,
      requestHandlers: this.currentHandlers,
      emitter: this.emitter,
      workerChannel: {
        on: (eventType, callback) => {
          this.context.events.addListener<
            MessageEvent<ServiceWorkerMessage<typeof eventType, any>>
          >(navigator.serviceWorker, 'message', (event) => {
            // Avoid messages broadcasted from unrelated workers.
            if (event.source !== this.context.worker) {
              return
            }

            const message = event.data

            if (!message) {
              return
            }

            if (message.type === eventType) {
              callback(event, message)
            }
          })
        },
        send: (type) => {
          this.context.worker?.postMessage(type)
        },
      },
      events: {
        addListener: (target, eventType, callback) => {
          target.addEventListener(eventType, callback as EventListener)
          this.listeners.push({
            eventType,
            target,
            callback: callback as EventListener,
          })

          return () => {
            target.removeEventListener(eventType, callback as EventListener)
          }
        },
        removeAllListeners: () => {
          for (const { target, eventType, callback } of this.listeners) {
            target.removeEventListener(eventType, callback)
          }
          this.listeners = []
        },
        once: (eventType) => {
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
              this.context.events.addListener(
                navigator.serviceWorker,
                'message',
                handleIncomingMessage,
              ),
              this.context.events.addListener(
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

    /**
     * @todo Not sure I like this but "this.currentHandlers"
     * updates never bubble to "this.context.requestHandlers".
     */
    Object.defineProperties(context, {
      requestHandlers: {
        get: () => this.currentHandlers,
      },
    })

    this.startHandler = context.useFallbackMode
      ? createFallbackStart(context)
      : createStartHandler(context)

    this.stopHandler = context.useFallbackMode
      ? createFallbackStop(context)
      : createStop(context)

    return context
  }

  public async start(options: StartOptions = {}): StartReturnType {
    this.context.startOptions = mergeRight(
      DEFAULT_START_OPTIONS,
      options,
    ) as SetupWorkerInternalContext['startOptions']

    return await this.startHandler(this.context.startOptions, options)
  }

  public printHandlers(): void {
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
      console.groupEnd()
    })
  }

  public stop(): void {
    super.dispose()
    this.context.events.removeAllListeners()
    this.context.emitter.removeAllListeners()
    this.stopHandler()
  }
}

/**
 * Sets up a requests interception in the browser with the given request handlers.
 * @param {RequestHandler[]} handlers List of request handlers.
 * @see {@link https://mswjs.io/docs/api/setup-worker `setupWorker`}
 */
export function setupWorker(...handlers: Array<RequestHandler>): SetupWorker {
  return new SetupWorkerApi(...handlers)
}

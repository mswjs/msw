import { isNodeProcess } from 'is-node-process'
import {
  SetupWorkerInternalContext,
  ServiceWorkerIncomingEventsMap,
  WorkerLifecycleEventsMap,
  StartReturnType,
} from './glossary'
import { createStartHandler } from './start/createStartHandler'
import { createStop } from './stop/createStop'
import { ServiceWorkerMessage } from './start/utils/createMessageChannel'
import { RequestHandler } from '../handlers/RequestHandler'
import { RestHandler } from '../handlers/RestHandler'
import { DEFAULT_START_OPTIONS } from './start/utils/prepareStartHandler'
import { createFallbackStart } from './start/createFallbackStart'
import { createFallbackStop } from './stop/createFallbackStop'
import { devUtils } from '../utils/internal/devUtils'
import { SetupApi } from '../createSetupApi'
import { mergeRight } from '../utils/internal/mergeRight'

interface Listener {
  target: EventTarget
  eventType: string
  callback: EventListener
}

/**
 * Concrete class to implement the SetupApi for the browser environment, uses the ServerWorker setup.
 */
export class SetupWorkerApi extends SetupApi<WorkerLifecycleEventsMap> {
  private context: SetupWorkerInternalContext
  private startHandler: any
  private stopHandler: any
  private listeners: Listener[] = []

  constructor(handlers: RequestHandler[]) {
    super([], 'worker-setup', handlers)

    if (isNodeProcess()) {
      throw new Error(
        devUtils.formatMessage(
          'Failed to execute `setupWorker` in a non-browser environment. Consider using `setupServer` for Node.js environment instead.',
        ),
      )
    }

    this.context = {} as SetupWorkerInternalContext

    this.initializeWorkerContext()
  }

  public initializeWorkerContext(): void {
    this.context = {
      // Mocking is not considered enabled until the worker
      // signals back the successful activation event.
      isMockingEnabled: false,
      startOptions: undefined,
      worker: null,
      registration: null,
      requestHandlers: this.currentHandlers,
      emitter: this.emitter,
      workerChannel: {
        on: <EventType extends keyof ServiceWorkerIncomingEventsMap>(
          eventType: EventType,
          callback: (
            event: MessageEvent,
            message: ServiceWorkerMessage<
              EventType,
              ServiceWorkerIncomingEventsMap[EventType]
            >,
          ) => void,
        ) => {
          this.context.events.addListener(
            navigator.serviceWorker,
            'message',
            (event: MessageEvent) => {
              // Avoid messages broadcasted from unrelated workers.
              if (event.source !== this.context.worker) {
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
        send: (type: any) => {
          this.context.worker?.postMessage(type)
        },
      },
      events: {
        addListener: (
          target: EventTarget,
          eventType: string,
          callback: EventListener,
        ) => {
          target.addEventListener(eventType, callback)
          this.listeners.push({ eventType, target, callback })

          return () => {
            target.removeEventListener(eventType, callback)
          }
        },
        removeAllListeners: () => {
          for (const { target, eventType, callback } of this.listeners) {
            target.removeEventListener(eventType, callback)
          }
          this.listeners = []
        },
        once: <EventType extends keyof ServiceWorkerIncomingEventsMap>(
          eventType: EventType,
        ) => {
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

    this.startHandler = this.context.useFallbackMode
      ? createFallbackStart(this.context)
      : createStartHandler(this.context)
    this.stopHandler = this.context.useFallbackMode
      ? createFallbackStop(this.context)
      : createStop(this.context)
  }

  public async start(options: Record<string, any> = {}): StartReturnType {
    this.context.startOptions = mergeRight(
      DEFAULT_START_OPTIONS,
      options,
    ) as SetupWorkerInternalContext['startOptions']

    return await this.startHandler(this.context.startOptions, options)
  }

  public restoreHandlers(): void {
    this.context.requestHandlers.forEach((handler) => {
      handler.markAsSkipped(false)
    })
  }

  public resetHandlers(...nextHandlers: RequestHandler[]) {
    this.context.requestHandlers =
      nextHandlers.length > 0 ? [...nextHandlers] : [...this.initialHandlers]
  }

  public printHandlers() {
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
        console.log('Match:', `https://mswjs.io/repl?path=${handler.info.path}`)
      }

      console.groupEnd()
    })
  }

  public stop(): void {
    this.context.events.removeAllListeners()
    this.context.emitter.removeAllListeners()
    this.publicEmitter.removeAllListeners()
    this.stopHandler()
  }
}

export function setupWorker(...handlers: RequestHandler[]) {
  return new SetupWorkerApi(handlers)
}

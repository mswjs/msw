import { invariant } from 'outvariant'
import { EventMapType, StrictEventEmitter } from 'strict-event-emitter'
import {
  RequestHandler,
  RequestHandlerDefaultInfo,
} from './handlers/RequestHandler'
import { LifeCycleEventEmitter } from './sharedOptions'
import { devUtils } from './utils/internal/devUtils'
import { pipeEvents } from './utils/internal/pipeEvents'
import { toReadonlyArray } from './utils/internal/toReadonlyArray'

/**
 * Generic class for the mock API setup.
 */
export abstract class SetupApi<EventsMap extends EventMapType> {
  protected initialHandlers: ReadonlyArray<RequestHandler>
  protected currentHandlers: Array<RequestHandler>
  protected readonly emitter: StrictEventEmitter<EventsMap>
  protected readonly publicEmitter: StrictEventEmitter<EventsMap>

  public readonly events: LifeCycleEventEmitter<EventsMap>

  constructor(initialHandlers: Array<RequestHandler>) {
    this.validateHandlers(initialHandlers)

    this.initialHandlers = toReadonlyArray(initialHandlers)
    this.currentHandlers = [...initialHandlers]

    this.emitter = new StrictEventEmitter<EventsMap>()
    this.publicEmitter = new StrictEventEmitter<EventsMap>()
    pipeEvents(this.emitter, this.publicEmitter)

    this.events = this.createLifeCycleEvents()
  }

  private validateHandlers(handlers: ReadonlyArray<RequestHandler>): void {
    // Guard against incorrect call signature of the setup API.
    for (const handler of handlers) {
      invariant(
        !Array.isArray(handler),
        devUtils.formatMessage(
          'Failed to construct "%s" given an Array of request handlers. Make sure you spread the request handlers when calling the respective setup function.',
        ),
        this.constructor.name,
      )
    }
  }

  protected dispose(): void {
    this.emitter.removeAllListeners()
    this.publicEmitter.removeAllListeners()
  }

  public use(...runtimeHandlers: Array<RequestHandler>): void {
    this.currentHandlers.unshift(...runtimeHandlers)
  }

  public restoreHandlers(): void {
    this.currentHandlers.forEach((handler) => {
      handler.isUsed = false
    })
  }

  public resetHandlers(...nextHandlers: Array<RequestHandler>): void {
    this.currentHandlers =
      nextHandlers.length > 0 ? [...nextHandlers] : [...this.initialHandlers]
  }

  public listHandlers(): ReadonlyArray<
    RequestHandler<RequestHandlerDefaultInfo, any, any>
  > {
    return toReadonlyArray(this.currentHandlers)
  }

  private createLifeCycleEvents(): LifeCycleEventEmitter<EventsMap> {
    return {
      on: (...args) => {
        return this.publicEmitter.on(...args)
      },
      removeListener: (...args) => {
        return this.publicEmitter.removeListener(...args)
      },
      removeAllListeners: (...args: any) => {
        return this.publicEmitter.removeAllListeners(...args)
      },
    }
  }

  abstract printHandlers(): void
}

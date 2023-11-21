import { invariant } from 'outvariant'
import { EventMap, Emitter } from 'strict-event-emitter'
import {
  RequestHandler,
  RequestHandlerDefaultInfo,
} from './handlers/RequestHandler'
import { LifeCycleEventEmitter } from './sharedOptions'
import { devUtils } from './utils/internal/devUtils'
import { pipeEvents } from './utils/internal/pipeEvents'
import { toReadonlyArray } from './utils/internal/toReadonlyArray'
import { Disposable } from './utils/internal/Disposable'

/**
 * Generic class for the mock API setup.
 */
export abstract class SetupApi<EventsMap extends EventMap> extends Disposable {
  protected initialHandlers: ReadonlyArray<RequestHandler>
  protected currentHandlers: Array<RequestHandler>
  protected readonly emitter: Emitter<EventsMap>
  protected readonly publicEmitter: Emitter<EventsMap>

  public readonly events: LifeCycleEventEmitter<EventsMap>

  constructor(...initialHandlers: Array<RequestHandler>) {
    super()

    invariant(
      this.validateHandlers(initialHandlers),
      devUtils.formatMessage(
        `Failed to construct "%s": given invalid initial request handlers value. Did you forget to spread the list of request handlers when calling this setup function?`,
        this.constructor.name,
      ),
    )

    this.initialHandlers = toReadonlyArray(initialHandlers)
    this.currentHandlers = [...initialHandlers]

    this.emitter = new Emitter<EventsMap>()
    this.publicEmitter = new Emitter<EventsMap>()
    pipeEvents(this.emitter, this.publicEmitter)

    this.events = this.createLifeCycleEvents()

    this.subscriptions.push(() => {
      this.emitter.removeAllListeners()
      this.publicEmitter.removeAllListeners()
    })
  }

  private validateHandlers(handlers: ReadonlyArray<RequestHandler>): boolean {
    // Guard against incorrect call signature of the setup API.
    for (const handler of handlers) {
      if (Array.isArray(handler)) {
        return false
      }
    }

    return true
  }

  public use(...runtimeHandlers: Array<RequestHandler>): void {
    invariant(
      this.validateHandlers(runtimeHandlers),
      devUtils.formatMessage(
        `Failed to call "use()" on "%s": given invalid runtime handlers value. Did you forget to spread the array of request handlers?`,
        this.constructor.name,
      ),
    )

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
      on: (...args: any[]) => {
        return (this.publicEmitter.on as any)(...args)
      },
      removeListener: (...args: any[]) => {
        return (this.publicEmitter.removeListener as any)(...args)
      },
      removeAllListeners: (...args: any[]) => {
        return this.publicEmitter.removeAllListeners(...args)
      },
    }
  }
}

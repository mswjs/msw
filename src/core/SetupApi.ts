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

export abstract class HandlersController {
  abstract prepend(runtimeHandlers: Array<RequestHandler>): void
  abstract reset(nextHandles: Array<RequestHandler>): void
  abstract currentHandlers(): Array<RequestHandler>
}

export class InMemoryHandlersController implements HandlersController {
  private handlers: Array<RequestHandler>

  constructor(private initialHandlers: Array<RequestHandler>) {
    this.handlers = [...initialHandlers]
  }

  public prepend(runtimeHandles: Array<RequestHandler>): void {
    this.handlers.unshift(...runtimeHandles)
  }

  public reset(nextHandlers: Array<RequestHandler>): void {
    this.handlers =
      nextHandlers.length > 0 ? [...nextHandlers] : [...this.initialHandlers]
  }

  public currentHandlers(): Array<RequestHandler> {
    return this.handlers
  }
}

/**
 * Generic class for the mock API setup.
 */
export abstract class SetupApi<EventsMap extends EventMap> extends Disposable {
  protected handlersController: HandlersController
  protected readonly emitter: Emitter<EventsMap>
  protected readonly publicEmitter: Emitter<EventsMap>

  public readonly events: LifeCycleEventEmitter<EventsMap>

  constructor(...initialHandlers: Array<RequestHandler>) {
    super()

    invariant(
      this.validateHandlers(initialHandlers),
      devUtils.formatMessage(
        `Failed to apply given request handlers: invalid input. Did you forget to spread the request handlers Array?`,
      ),
    )

    this.handlersController = new InMemoryHandlersController(initialHandlers)

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
    return handlers.every((handler) => !Array.isArray(handler))
  }

  public use(...runtimeHandlers: Array<RequestHandler>): void {
    invariant(
      this.validateHandlers(runtimeHandlers),
      devUtils.formatMessage(
        `Failed to call "use()" with the given request handlers: invalid input. Did you forget to spread the array of request handlers?`,
      ),
    )

    this.handlersController.prepend(runtimeHandlers)
  }

  public restoreHandlers(): void {
    this.handlersController.currentHandlers().forEach((handler) => {
      handler.isUsed = false
    })
  }

  public resetHandlers(...nextHandlers: Array<RequestHandler>): void {
    this.handlersController.reset(nextHandlers)
  }

  public listHandlers(): ReadonlyArray<
    RequestHandler<RequestHandlerDefaultInfo, any, any>
  > {
    return toReadonlyArray(this.handlersController.currentHandlers())
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

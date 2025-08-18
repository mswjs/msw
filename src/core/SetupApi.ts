import { invariant } from 'outvariant'
import { Emitter, type DefaultEventMap } from 'rettime'
import { RequestHandler } from './handlers/RequestHandler'
import { LifeCycleEventEmitter } from './sharedOptions'
import { devUtils } from './utils/internal/devUtils'
import { pipeEvents } from './utils/internal/pipeEvents'
import { toReadonlyArray } from './utils/internal/toReadonlyArray'
import { Disposable } from './utils/internal/Disposable'
import type { WebSocketHandler } from './handlers/WebSocketHandler'

export abstract class HandlersController {
  abstract prepend(
    runtimeHandlers: Array<RequestHandler | WebSocketHandler>,
  ): void
  abstract reset: (
    nextHandles: Array<RequestHandler | WebSocketHandler>,
  ) => void
  abstract currentHandlers: () => Array<RequestHandler | WebSocketHandler>
}

export class InMemoryHandlersController implements HandlersController {
  private handlers: Array<RequestHandler | WebSocketHandler>

  constructor(
    private initialHandlers: Array<RequestHandler | WebSocketHandler>,
  ) {
    this.handlers = [...initialHandlers]
  }

  public prepend(
    runtimeHandles: Array<RequestHandler | WebSocketHandler>,
  ): void {
    this.handlers.unshift(...runtimeHandles)
  }

  public reset(nextHandlers: Array<RequestHandler | WebSocketHandler>): void {
    this.handlers =
      nextHandlers.length > 0 ? [...nextHandlers] : [...this.initialHandlers]
  }

  public currentHandlers(): Array<RequestHandler | WebSocketHandler> {
    return this.handlers
  }
}

/**
 * Generic class for the mock API setup.
 */
export abstract class SetupApi<
  EventMap extends DefaultEventMap,
> extends Disposable {
  protected handlersController: HandlersController
  protected readonly emitter: Emitter<EventMap>
  protected readonly publicEmitter: Emitter<EventMap>

  public readonly events: LifeCycleEventEmitter<EventMap>

  constructor(...initialHandlers: Array<RequestHandler | WebSocketHandler>) {
    super()

    invariant(
      this.validateHandlers(initialHandlers),
      devUtils.formatMessage(
        `Failed to apply given request handlers: invalid input. Did you forget to spread the request handlers Array?`,
      ),
    )

    this.handlersController = new InMemoryHandlersController(initialHandlers)

    this.emitter = new Emitter<EventMap>()
    this.publicEmitter = new Emitter<EventMap>()
    pipeEvents(this.emitter, this.publicEmitter)

    this.events = this.createLifeCycleEvents()

    this.subscriptions.push(() => {
      this.emitter.removeAllListeners()
      this.publicEmitter.removeAllListeners()
    })
  }

  private validateHandlers(handlers: ReadonlyArray<unknown>): boolean {
    // Guard against incorrect call signature of the setup API.
    return handlers.every((handler) => !Array.isArray(handler))
  }

  public use(
    ...runtimeHandlers: Array<RequestHandler | WebSocketHandler>
  ): void {
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
      if ('isUsed' in handler) {
        handler.isUsed = false
      }
    })
  }

  public resetHandlers(
    ...nextHandlers: Array<RequestHandler | WebSocketHandler>
  ): void {
    this.handlersController.reset(nextHandlers)
  }

  public listHandlers(): ReadonlyArray<RequestHandler | WebSocketHandler> {
    return toReadonlyArray(this.handlersController.currentHandlers())
  }

  private createLifeCycleEvents(): LifeCycleEventEmitter<EventMap> {
    return {
      on: this.publicEmitter.on.bind(this.publicEmitter),
      removeListener: this.publicEmitter.removeListener.bind(
        this.publicEmitter,
      ),
      removeAllListeners: this.publicEmitter.removeAllListeners.bind(
        this.publicEmitter,
      ),
    }
  }
}

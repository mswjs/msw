import { AsyncLocalStorage } from 'node:async_hooks'
import {
  type AnyHandler,
  HandlersController,
} from '#core/new/handlers-controller'

export interface AsyncHandlersControllerContext {
  initialHandlers: Array<AnyHandler>
  handlers: Array<AnyHandler>
}

export class AsyncHandlersController extends HandlersController {
  #fallbackContext: AsyncHandlersControllerContext

  public context: AsyncLocalStorage<AsyncHandlersControllerContext>

  constructor(initialHandlers: Array<AnyHandler>) {
    super(initialHandlers)

    this.context = new AsyncLocalStorage()
    this.#fallbackContext = {
      initialHandlers: [...initialHandlers],
      handlers: [],
    }
  }

  get currentHandlers() {
    const { initialHandlers, handlers } = this.#getContext()
    return [...handlers, ...initialHandlers]
  }

  public use(nextHandlers: Array<AnyHandler>): void {
    super.use(nextHandlers)

    this.#getContext().handlers.unshift(...nextHandlers)
  }

  public reset(nextHandlers: Array<AnyHandler>): void {
    super.reset(nextHandlers)

    const context = this.#getContext()
    context.handlers = []

    if (nextHandlers.length > 0) {
      context.initialHandlers = [...nextHandlers]
    }
  }

  #getContext() {
    return this.context.getStore() || this.#fallbackContext
  }
}

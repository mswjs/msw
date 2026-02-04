import { AsyncLocalStorage } from 'node:async_hooks'
import {
  type AnyHandler,
  type HandlersMap,
  HandlersController,
  HandlersControllerState,
} from '#core/new/handlers-controller'

export interface AsyncHandlersControllerContext {
  initialHandlers: HandlersMap
  handlers: HandlersMap
}

export class AsyncHandlersController extends HandlersController {
  #fallbackContext: AsyncHandlersControllerContext

  public context: AsyncLocalStorage<AsyncHandlersControllerContext>

  constructor(initialHandlers: Array<AnyHandler>) {
    super()

    const initialState = this.getInitialState(initialHandlers)

    this.context = new AsyncLocalStorage()

    this.#fallbackContext = {
      initialHandlers: initialState.initialHandlers,
      handlers: initialState.handlers,
    }
  }

  protected getState() {
    const context = this.#getContext()

    return {
      initialHandlers: context.initialHandlers,
      handlers: context.handlers,
    }
  }

  protected setState(nextState: HandlersControllerState): void {
    const context = this.#getContext()

    if (nextState.initialHandlers) {
      context.initialHandlers = nextState.initialHandlers
    }

    if (nextState.handlers) {
      context.handlers = nextState.handlers
    }
  }

  // public get currentHandlers() {
  //   const { initialHandlers, handlers } = this.getState()

  // This looks terribly incorrect.
  //   return [...Object.values(handlers), ...Object.values(initialHandlers)]
  //     .flat()
  //     .filter((handler) => handler != null)
  // }

  // public reset(nextHandlers: Array<AnyHandler>): void {
  //   super.reset(nextHandlers)

  //   const context = this.#getContext()
  //   context.handlers = [...initialHandlers]

  //   if (nextHandlers.length > 0) {
  //     context.initialHandlers = [...nextHandlers]
  //   }
  // }

  #getContext() {
    return this.context.getStore() || this.#fallbackContext
  }
}

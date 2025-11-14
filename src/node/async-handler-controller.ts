import { AsyncLocalStorage } from 'node:async_hooks'
import {
  HandlersController,
  AnyHandler,
  defineHandlersController,
} from '~/core/new/handlers-controller'

export interface AsyncHandlersController extends HandlersController {
  context: AsyncLocalStorage<AsyncHandlersControllerContext>
}

export interface AsyncHandlersControllerContext {
  initialHandlers: Array<AnyHandler>
  handlers: Array<AnyHandler>
}

export const asyncHandlersController =
  defineHandlersController<AsyncHandlersController>((initialHandlers) => {
    const context = new AsyncLocalStorage<AsyncHandlersControllerContext>()

    const fallbackContext: AsyncHandlersControllerContext = {
      initialHandlers: [...initialHandlers],
      handlers: [],
    }

    const getContext = () => {
      return context.getStore() || fallbackContext
    }

    return {
      context,
      currentHandlers() {
        const { initialHandlers, handlers } = getContext()
        return [...handlers, ...initialHandlers]
      },
      use(nextHandlers) {
        getContext().handlers.unshift(...nextHandlers)
      },
      reset(nextHandlers) {
        const context = getContext()
        context.handlers = []
        context.initialHandlers =
          nextHandlers.length > 0 ? nextHandlers : context.initialHandlers
      },
    }
  })

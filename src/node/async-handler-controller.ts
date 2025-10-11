import { AsyncLocalStorage } from 'node:async_hooks'
import { HandlersController, AnyHandler } from '~/core/new/handlers-controller'

export interface AsyncHandlersController<Handler extends AnyHandler>
  extends HandlersController<Handler> {
  context: AsyncLocalStorage<AsyncHandlersControllerContext<Handler>>
}

export interface AsyncHandlersControllerContext<Handler extends AnyHandler> {
  initialHandlers: Array<Handler>
  handlers: Array<Handler>
}

export function asyncHandlersController<Handler extends AnyHandler>(
  initialHandlers: Array<Handler>,
): AsyncHandlersController<Handler> {
  const context = new AsyncLocalStorage<
    AsyncHandlersControllerContext<Handler>
  >()
  const fallbackContext: AsyncHandlersControllerContext<Handler> = {
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
}

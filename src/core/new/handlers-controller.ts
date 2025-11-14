import { invariant } from 'outvariant'
import { RequestHandler } from '../handlers/RequestHandler'
import { WebSocketHandler } from '../handlers/WebSocketHandler'
import { devUtils } from '../utils/internal/devUtils'

export type AnyHandler = RequestHandler | WebSocketHandler

export type HandlersControllerFunction<Controller extends HandlersController> =
  (initialHandlers: Array<AnyHandler>) => Controller

export interface HandlersController {
  currentHandlers(): Array<AnyHandler>
  use(nextHandlers: Array<AnyHandler>): void
  reset(nextHandlers: Array<AnyHandler>): void
}

export function validateHandlers(handlers: Array<AnyHandler>): boolean {
  return handlers.every((handler) => !Array.isArray(handler))
}

export function defineHandlersController<
  Controller extends HandlersController = HandlersController,
>(
  init: HandlersControllerFunction<Controller>,
): HandlersControllerFunction<Controller> {
  return (initialHandlers) => {
    invariant(
      validateHandlers(initialHandlers),
      devUtils.formatMessage(
        'Failed to create a handlers controller: invalid handlers. Did you forget to spread the handlers array?',
      ),
    )

    const api = init(initialHandlers)

    return {
      ...api,
      use(nextHandlers) {
        invariant(
          validateHandlers(nextHandlers),
          devUtils.formatMessage(
            'Failed to prepend runtime handlers: invalid handlers. Did you forget to spread the handlers array?',
          ),
        )

        return api.use(nextHandlers)
      },
      reset(nextHandlers) {
        invariant(
          nextHandlers.length > 0 ? validateHandlers(nextHandlers) : true,
          devUtils.formatMessage(
            'Failed to replace initial handlers during reset: invalid handlers. Did you forget to spread the handlers array?',
          ),
        )

        return api.reset(nextHandlers)
      },
    }
  }
}

export const inMemoryHandlersController = defineHandlersController(
  (initialHandlers) => {
    let handlers = [...initialHandlers]

    return {
      currentHandlers() {
        return handlers
      },
      use(nextHandlers) {
        handlers.unshift(...nextHandlers)
      },
      reset(nextHandlers) {
        handlers =
          nextHandlers.length > 0 ? [...nextHandlers] : [...initialHandlers]
      },
    }
  },
)

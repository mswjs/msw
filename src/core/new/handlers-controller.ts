import { RequestHandler } from '../handlers/RequestHandler'
import { WebSocketHandler } from '../handlers/WebSocketHandler'

export type AnyHandler = RequestHandler | WebSocketHandler

export interface HandlersController<Handler extends AnyHandler = AnyHandler> {
  currentHandlers(): Array<Handler>
  use(nextHandlers: Array<Handler>): void
  reset(nextHandlers: Array<Handler>): void
}

/**
 * A simple handler controller that keeps the list of handlers in memory.
 */
export function inMemoryHandlersController<Handler extends AnyHandler>(
  initialHandlers: Array<Handler>,
): HandlersController<Handler> {
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
}

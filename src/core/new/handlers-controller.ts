import { invariant } from 'outvariant'
import { type HttpHandler } from '../handlers/HttpHandler'
import { type WebSocketHandler } from '../handlers/WebSocketHandler'
import { devUtils } from '../utils/internal/devUtils'

export type AnyHandler = HttpHandler | WebSocketHandler

function validateHandlers(handlers: Array<AnyHandler>): boolean {
  return handlers.every((handler) => !Array.isArray(handler))
}

export abstract class HandlersController {
  constructor(initialHandlers: Array<AnyHandler>) {
    invariant(
      validateHandlers(initialHandlers),
      devUtils.formatMessage(
        '[MSW] Failed to apply given request handlers: invalid input. Did you forget to spread the request handlers Array?',
      ),
    )
  }

  public abstract get currentHandlers(): Array<AnyHandler>

  public use(nextHandlers: Array<AnyHandler>): void {
    invariant(
      validateHandlers(nextHandlers),
      devUtils.formatMessage(
        '[MSW] Failed to call "use()" with the given request handlers: invalid input. Did you forget to spread the array of request handlers?',
      ),
    )
  }

  public reset(nextHandlers: Array<AnyHandler>): void {
    invariant(
      nextHandlers.length > 0 ? validateHandlers(nextHandlers) : true,
      devUtils.formatMessage(
        'Failed to replace initial handlers during reset: invalid handlers. Did you forget to spread the handlers array?',
      ),
    )
  }
}

export class InMemoryHandlersController extends HandlersController {
  #handlers: Array<AnyHandler>
  #initialHandlers: Array<AnyHandler>

  constructor(initialHandlers: Array<AnyHandler>) {
    super(initialHandlers)

    this.#initialHandlers = initialHandlers
    this.#handlers = [...initialHandlers]
  }

  get currentHandlers() {
    return this.#handlers
  }

  public use(nextHandlers: Array<AnyHandler>): void {
    super.use(nextHandlers)
    this.#handlers.unshift(...nextHandlers)
  }

  public reset(nextHandlers: Array<AnyHandler>): void {
    super.reset(nextHandlers)
    this.#handlers =
      nextHandlers.length > 0 ? [...nextHandlers] : [...this.#initialHandlers]
  }
}

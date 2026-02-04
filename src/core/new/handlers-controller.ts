import { invariant } from 'outvariant'
import { type HttpHandler } from '../handlers/HttpHandler'
import { type GraphQLHandler } from '../handlers/GraphQLHandler'
import { type WebSocketHandler } from '../handlers/WebSocketHandler'
import { devUtils } from '../utils/internal/devUtils'

export type AnyHandler = HttpHandler | GraphQLHandler | WebSocketHandler
export type HandlersMap = Partial<Record<string, Array<AnyHandler>>>

export function groupHandlersByKind(handlers: Array<AnyHandler>): HandlersMap {
  const groups: HandlersMap = {}

  /**
   * @note `Object.groupBy` is not implemented in Node.js v20.
   */
  for (const handler of handlers) {
    ;(groups[handler.kind] ||= []).push(handler)
  }

  return groups
}

export interface HandlersControllerState {
  initialHandlers: HandlersMap
  handlers: HandlersMap
}

export abstract class HandlersController {
  protected getInitialState(
    initialHandlers: Array<AnyHandler>,
  ): HandlersControllerState {
    invariant(
      this.#validateHandlers(initialHandlers),
      devUtils.formatMessage(
        '[MSW] Failed to apply given request handlers: invalid input. Did you forget to spread the request handlers Array?',
      ),
    )

    const normalizedInitialHandlers = groupHandlersByKind(initialHandlers)

    return {
      initialHandlers: normalizedInitialHandlers,
      handlers: { ...normalizedInitialHandlers },
    }
  }

  protected abstract getState(): HandlersControllerState
  protected abstract setState(nextState: Partial<HandlersControllerState>): void

  public get currentHandlers(): Array<AnyHandler> {
    return Object.values(this.getState().handlers)
      .flat()
      .filter((handler) => handler != null)
  }

  public getHandlersByKind(kind: AnyHandler['kind']): Array<AnyHandler> {
    return this.getState().handlers[kind] || []
  }

  public use(nextHandlers: Array<AnyHandler>): void {
    invariant(
      this.#validateHandlers(nextHandlers),
      devUtils.formatMessage(
        '[MSW] Failed to call "use()" with the given request handlers: invalid input. Did you forget to spread the array of request handlers?',
      ),
    )

    if (nextHandlers.length === 0) {
      return
    }

    const { handlers } = this.getState()

    // Iterate over next handlers and prepend them to their respective lists.
    // Iterate in a reverse order to the keep the order of the runtime handlers as provided.
    for (let i = nextHandlers.length - 1; i >= 0; i--) {
      const handler = nextHandlers[i]
      handlers[handler.kind] = handlers[handler.kind]
        ? [handler, ...handlers[handler.kind]!]
        : [handler]
    }
  }

  public reset(nextHandlers: Array<AnyHandler>): void {
    invariant(
      nextHandlers.length > 0 ? this.#validateHandlers(nextHandlers) : true,
      devUtils.formatMessage(
        'Failed to replace initial handlers during reset: invalid handlers. Did you forget to spread the handlers array?',
      ),
    )

    const { initialHandlers } = this.getState()

    if (nextHandlers.length === 0) {
      this.setState({
        handlers: { ...initialHandlers },
      })

      return
    }

    const normalizedNextHandlers = groupHandlersByKind(nextHandlers)

    this.setState({
      initialHandlers:
        nextHandlers.length > 0 ? normalizedNextHandlers : undefined,
      handlers: { ...normalizedNextHandlers },
    })
  }

  #validateHandlers(handlers: Array<AnyHandler>): boolean {
    return handlers.every((handler) => !Array.isArray(handler))
  }
}

export class InMemoryHandlersController extends HandlersController {
  #handlers: HandlersMap
  #initialHandlers: HandlersMap

  constructor(initialHandlers: Array<AnyHandler>) {
    super()

    const initialState = this.getInitialState(initialHandlers)

    this.#initialHandlers = initialState.initialHandlers
    this.#handlers = initialState.handlers
  }

  protected getState(): HandlersControllerState {
    return {
      initialHandlers: this.#initialHandlers,
      handlers: this.#handlers,
    }
  }

  protected setState(nextState: Partial<HandlersControllerState>): void {
    if (nextState.initialHandlers) {
      this.#initialHandlers = nextState.initialHandlers
    }

    if (nextState.handlers) {
      this.#handlers = nextState.handlers
    }
  }
}

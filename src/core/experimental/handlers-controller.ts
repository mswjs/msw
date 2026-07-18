import { invariant } from 'outvariant'
import { type RequestHandler } from '../handlers/RequestHandler'
import { type WebSocketHandler } from '../handlers/WebSocketHandler'
import { devUtils } from '../utils/internal/devUtils'
import type { MaybePromise } from '../typeUtils'
import {
  getSiblingHandlers,
  isSiblingHandler,
} from '../utils/internal/attachSiblingHandlers'

export type AnyHandler = RequestHandler | WebSocketHandler
export type HandlersMap = Partial<Record<AnyHandler['kind'], Array<AnyHandler>>>

export function groupHandlersByKind(handlers: Array<AnyHandler>): HandlersMap {
  const groups: HandlersMap = {}
  const visitedHandlers = new Set<AnyHandler>()

  const visit = (handler: AnyHandler) => {
    if (visitedHandlers.has(handler)) {
      return
    }

    visitedHandlers.add(handler)
    const bucket = (groups[handler.kind] ||= [])
    bucket.push(handler)

    // Recurse so siblings of siblings (user-composed handler
    // graphs) are grouped as well, not silently dropped.
    for (const sibling of getSiblingHandlers(handler)) {
      visit(sibling)
    }
  }

  /**
   * @note `Object.groupBy` is not implemented in Node.js v20.
   */
  for (const handler of handlers) {
    visit(handler)
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
        'Failed to apply given request handlers: invalid input. Did you forget to spread the request handlers Array?',
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

  public currentHandlers(): Array<AnyHandler> {
    return Object.values(this.getState().handlers)
      .flat()
      .filter((handler) => handler != null)
  }

  /**
   * Return the list of explicitly registered handlers.
   * Unlike `currentHandlers()`, this excludes sibling handlers,
   * which are an implementation detail (e.g. the WebSocket upgrade
   * handler or the GraphQL subscription transport).
   */
  public listHandlers(): Array<AnyHandler> {
    return this.currentHandlers().filter((handler) => {
      return !isSiblingHandler(handler)
    })
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
    const overrides = groupHandlersByKind(nextHandlers)

    // Prepend overrides to their respective kind buckets so they take
    // priority over existing handlers while preserving input order.
    // Drop existing references that reappear in the overrides (e.g. a
    // shared upgrade sibling from the same link) so a handler is never
    // registered twice.
    for (const kind in overrides) {
      const overridesForKind = overrides[kind as AnyHandler['kind']]!
      const existingForKind = handlers[kind as AnyHandler['kind']]
      handlers[kind as AnyHandler['kind']] = existingForKind
        ? [
            ...overridesForKind,
            ...existingForKind.filter((existingHandler) => {
              return !overridesForKind.includes(existingHandler)
            }),
          ]
        : overridesForKind
    }

    this.setState({ handlers })
  }

  public reset(nextHandlers: Array<AnyHandler>): void {
    invariant(
      nextHandlers.length > 0 ? this.#validateHandlers(nextHandlers) : true,
      devUtils.formatMessage(
        'Failed to replace initial handlers during reset: invalid handlers. Did you forget to spread the handlers array?',
      ),
    )

    for (const handler of this.currentHandlers()) {
      handler.reset()
    }

    const { initialHandlers } = this.getState()

    if (nextHandlers.length === 0) {
      this.setState({
        handlers: { ...initialHandlers },
      })

      return
    }

    const normalizedNextHandlers = groupHandlersByKind(nextHandlers)

    this.setState({
      initialHandlers: normalizedNextHandlers,
      handlers: { ...normalizedNextHandlers },
    })
  }

  public restore(): void {
    for (const handler of this.currentHandlers()) {
      handler.restore()
    }
  }

  public dispose(): MaybePromise<void> {
    const pendingDisposals: Array<Promise<void>> = []

    for (const handler of this.currentHandlers()) {
      const disposal = handler.dispose()

      if (disposal instanceof Promise) {
        pendingDisposals.push(disposal)
      }
    }

    // Stay synchronous unless a handler actually disposes of
    // itself asynchronously.
    if (pendingDisposals.length > 0) {
      return Promise.all(pendingDisposals).then(() => {})
    }
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

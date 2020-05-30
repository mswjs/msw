import { RequestHandler } from '../handlers/requestHandler'
import { ComposeMocksInternalContext } from './glossary'
import { createStart } from './start/createStart'
import { createStop } from './stop/createStop'

export interface SetupWorkerApi {
  start: ReturnType<typeof createStart>
  stop: ReturnType<typeof createStop>
  use: (...handlers: RequestHandler<any, any>[]) => void
  resetHandlers: (...nextHandlers: RequestHandler<any, any>[]) => void
}

/**
 * Configures a Service Worker with the given request handler functions.
 */
export function setupWorker(
  ...requestHandlers: RequestHandler<any, any>[]
): SetupWorkerApi {
  const context: ComposeMocksInternalContext = {
    worker: null,
    registration: null,
    requestHandlers: [...requestHandlers],
  }

  return {
    start: createStart(context),
    stop: createStop(context),

    /**
     * Prepends given request handlers to the list of existing handlers.
     */
    use(...handlers) {
      context.requestHandlers.unshift(...handlers)
    },

    /**
     * Resets request handlers to the initial list given to the `setupWorker` call, or to the explicit next request handlers list, if given.
     */
    resetHandlers(...nextHandlers) {
      context.requestHandlers =
        nextHandlers.length > 0 ? [...nextHandlers] : [...requestHandlers]
    },
  }
}

/**
 * Composes multiple request handlers into a single mocking schema.
 * @deprecated
 */
export function composeMocks(...requestHandlers: RequestHandler<any, any>[]) {
  console.warn(
    '[MSW] The `composeMocks()` function is deprecated and will be removed in the next release. Please use the `setupWorker()` function instead.',
  )
  return setupWorker(...requestHandlers)
}

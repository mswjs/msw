import { RequestHandler } from '../handlers/requestHandler'
import { ComposeMocksInternalContext } from './glossary'
import { createStart } from './start/createStart'
import { createStop } from './stop/createStop'

/**
 * Configures a Service Worker with the given request handler functions.
 */
export function setupWorker(...requestHandlers: RequestHandler<any, any>[]) {
  const context: ComposeMocksInternalContext = {
    worker: null,
    registration: null,
    requestHandlers,
  }

  return {
    start: createStart(context),
    stop: createStop(context),
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

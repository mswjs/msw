import { RequestHandler } from '../handlers/requestHandler'
import { ComposeMocksInternalContext } from './glossary'
import { createStart } from './start/createStart'
import { createStop } from './stop/createStop'

/**
 * Composes multiple request handlers into a single mocking schema.
 */
export const composeMocks = (
  ...requestHandlers: RequestHandler<any, any>[]
) => {
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

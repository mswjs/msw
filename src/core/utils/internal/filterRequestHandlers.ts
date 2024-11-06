import { RequestHandler } from '../../handlers/RequestHandler'

/**
 * A filter function that ensures that the provided argument
 * is an instance of a `RequestHandler` class. This helps filter
 * out other handlers, like `WebSocketHandler`.
 */
export function toRequestHandlersOnly(input: unknown): input is RequestHandler {
  return input instanceof RequestHandler
}

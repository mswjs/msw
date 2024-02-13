import type { RequestHandler } from './handlers/RequestHandler'
import { executeHandlers } from './utils/executeHandlers'
import { randomId } from './utils/internal/randomId'

/**
 * Finds a response for the given request instance
 * in the array of request handlers.
 * @param handlers The array of request handlers.
 * @param request The `Request` instance.
 * @returns {Response} A mocked response, if any.
 */
export const getResponse = async (
  handlers: Array<RequestHandler>,
  request: Request,
): Promise<Response | undefined> => {
  const result = await executeHandlers({
    request,
    requestId: randomId(),
    handlers,
  })

  return result?.response
}

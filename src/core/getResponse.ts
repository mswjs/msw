import { createRequestId } from '@mswjs/interceptors'
import type { RequestHandler } from './handlers/RequestHandler'
import { executeHandlers } from './utils/executeHandlers'

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
    requestId: createRequestId(),
    handlers,
  })

  return result?.response
}

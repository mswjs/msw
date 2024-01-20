import type { RequestHandler } from './handlers/RequestHandler'
import { executeHandlers } from './utils/executeHandlers'
import { randomId } from './utils/internal/randomId'

export const getResponse = async (args: {
  request: Request
  handlers: Array<RequestHandler>
}): Promise<Response | undefined> => {
  const result = await executeHandlers({
    request: args.request,
    requestId: randomId(),
    handlers: args.handlers,
  })

  return result?.response
}

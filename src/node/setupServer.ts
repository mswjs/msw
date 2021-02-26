import { interceptClientRequest } from 'node-request-interceptor/lib/interceptors/ClientRequest'
import { interceptXMLHttpRequest } from 'node-request-interceptor/lib/interceptors/XMLHttpRequest'
import { createSetupServer } from './createSetupServer'

/**
 * Sets up a requests interception in Node.js with the given request handlers.
 * @param {RequestHandler[]} requestHandlers List of request handlers.
 * @see {@link https://mswjs.io/docs/api/setup-server `setupServer`}
 */
export const setupServer = createSetupServer(
  interceptClientRequest,
  interceptXMLHttpRequest,
)

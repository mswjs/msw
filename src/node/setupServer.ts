import { ClientRequestInterceptor } from '@mswjs/interceptors/lib/interceptors/ClientRequest/index.js'
import { XMLHttpRequestInterceptor } from '@mswjs/interceptors/lib/interceptors/XMLHttpRequest/index.js'
import { createSetupServer } from './createSetupServer'

/**
 * Sets up a requests interception in Node.js with the given request handlers.
 * @param {RequestHandler[]} requestHandlers List of request handlers.
 * @see {@link https://mswjs.io/docs/api/setup-server `setupServer`}
 */
export const setupServer = createSetupServer(
  // List each interceptor separately instead of using the "node" preset
  // so that MSW wouldn't bundle the unnecessary classes (i.e. "SocketPolyfill").
  ClientRequestInterceptor,
  XMLHttpRequestInterceptor,
)

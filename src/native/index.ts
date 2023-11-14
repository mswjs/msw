import { XMLHttpRequestInterceptor } from '@mswjs/interceptors/XMLHttpRequest'
import { RequestHandler } from '~/core/handlers/RequestHandler'
import { SetupServerApi } from '../node/SetupServerApi'

/**
 * Sets up a requests interception in React Native with the given request handlers.
 * @param {RequestHandler[]} handlers List of request handlers.
 *
 * @see {@link https://mswjs.io/docs/api/setup-server `setupServer()` API reference}
 */
export function setupServer(
  ...handlers: Array<RequestHandler>
): SetupServerApi {
  // Provision request interception via patching the `XMLHttpRequest` class only
  // in React Native. There is no `http`/`https` modules in that environment.
  return new SetupServerApi([XMLHttpRequestInterceptor], ...handlers)
}

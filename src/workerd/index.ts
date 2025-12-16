import { FetchInterceptor } from '@mswjs/interceptors/fetch'
import type { RequestHandler } from '~/core/handlers/RequestHandler'
import { SetupServerCommonApi } from '../node/SetupServerCommonApi'

/**
 * Sets up a requests interception in workerd with the given request handlers.
 * @param {RequestHandler[]} handlers List of request handlers.
 *
 * @see {@link https://mswjs.io/docs/api/setup-server `setupServer()` API reference}
 */
export function setupServer(
  ...handlers: Array<RequestHandler>
): SetupServerCommonApi {
  // Provision request interception via patching `fetch` only
  // in workerd. There is no `http`/`https` modules in that environment.
  return new SetupServerCommonApi([new FetchInterceptor()], handlers)
}

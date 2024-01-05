import { ClientRequestInterceptor } from '@mswjs/interceptors/ClientRequest'
import { XMLHttpRequestInterceptor } from '@mswjs/interceptors/XMLHttpRequest'
import { FetchInterceptor } from '@mswjs/interceptors/fetch'
import { RequestHandler } from '~/core/handlers/RequestHandler'
import { SetupServerApi } from './SetupServerApi'
import { SetupServer } from './glossary'

/**
 * Sets up a requests interception in Node.js with the given request handlers.
 * @param {RequestHandler[]} handlers List of request handlers.
 *
 * @see {@link https://mswjs.io/docs/api/setup-server `setupServer()` API reference}
 */
export const setupServer = (
  ...handlers: Array<RequestHandler>
): SetupServer => {
  return new SetupServerApi(
    [ClientRequestInterceptor, XMLHttpRequestInterceptor, FetchInterceptor],
    ...handlers,
  )
}

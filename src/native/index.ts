import { FetchInterceptor } from '@mswjs/interceptors/fetch'
import { XMLHttpRequestInterceptor } from '@mswjs/interceptors/XMLHttpRequest'
import { type AnyHandler } from '#core/new/handlers-controller'
import { SetupServerCommonApi } from '../node/setup-server-common'

/**
 * Sets up a requests interception in React Native with the given request handlers.
 * @param {Array<AnyHandler>} handlers List of request handlers.
 *
 * @see {@link https://mswjs.io/docs/api/setup-server `setupServer()` API reference}
 */
export function setupServer(
  ...handlers: Array<AnyHandler>
): SetupServerCommonApi {
  // Provision request interception via patching the `XMLHttpRequest` class only
  // in React Native. There is no `http`/`https` modules in that environment.
  return new SetupServerCommonApi(
    [new FetchInterceptor(), new XMLHttpRequestInterceptor()],
    handlers,
  )
}

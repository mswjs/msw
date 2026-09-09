import type { Interceptor, HttpRequestEventMap } from '@mswjs/interceptors'
import { ClientRequestInterceptor } from '@mswjs/interceptors/ClientRequest'
import { XMLHttpRequestInterceptor } from '@mswjs/interceptors/XMLHttpRequest/web'
import { FetchInterceptor } from '@mswjs/interceptors/fetch/web'
import { WebSocketInterceptor } from '@mswjs/interceptors/WebSocket'
import {
  defineNetwork,
  type DefineNetworkOptions,
} from '#core/experimental/define-network'
import type { AnyHandler } from '#core/experimental/handlers-controller'
import { InterceptorSource } from '#core/experimental/sources/interceptor-source'
import type { SetupServer } from './glossary'
import { AsyncHandlersController } from './async-handlers-controller'
import {
  defineSetupServerApi,
  SetupServerCommonApi,
} from './setup-server-common'

// The web interceptors preserve interception at the Fetch/XHR API boundary.
// Their declarations duplicate Interceptor's private fields across builds.
const defaultInterceptors = [
  new ClientRequestInterceptor(),
  new XMLHttpRequestInterceptor() as unknown as Interceptor<HttpRequestEventMap>,
  new FetchInterceptor() as unknown as Interceptor<HttpRequestEventMap>,
  new WebSocketInterceptor(),
]

export const defaultNetworkOptions: DefineNetworkOptions<[InterceptorSource]> =
  {
    sources: [
      new InterceptorSource({
        interceptors: defaultInterceptors,
      }),
    ],
    onUnhandledFrame: 'warn',
    context: {
      quiet: true,
    },
  }

/**
 * Enables request interception in Node.js with the given request handlers.
 * @see {@link https://mswjs.io/docs/api/setup-server `setupServer()` API reference}
 */
export function setupServer(...handlers: Array<AnyHandler>): SetupServer {
  const handlersController = new AsyncHandlersController(handlers)
  const network = defineNetwork({
    ...defaultNetworkOptions,
    handlers: handlersController,
  })

  const commonApi = defineSetupServerApi(network)

  return {
    ...commonApi,
    boundary: handlersController.boundary.bind(handlersController),
  }
}

/**
 * @deprecated
 * Please use the `defineNetwork` API instead.
 */
export class SetupServerApi
  extends SetupServerCommonApi
  implements SetupServer
{
  #handlersController: AsyncHandlersController

  public boundary: AsyncHandlersController['boundary']

  constructor(
    handlers: Array<AnyHandler>,
    interceptors: Array<Interceptor<any>>,
  ) {
    const controller = new AsyncHandlersController(handlers)
    super(interceptors, controller)

    const { sources: _, ...networkOptions } = defaultNetworkOptions
    this.network.configure(networkOptions)

    this.#handlersController = controller
    this.boundary = this.#handlersController.boundary.bind(
      this.#handlersController,
    )
  }
}

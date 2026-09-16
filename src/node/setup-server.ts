import type { Interceptor } from '@mswjs/interceptors'
import { ClientRequestInterceptor } from '@mswjs/interceptors/ClientRequest'
import { XMLHttpRequestInterceptor } from '@mswjs/interceptors/XMLHttpRequest'
import { FetchInterceptor } from '@mswjs/interceptors/fetch'
import { WebSocketInterceptor } from '@mswjs/interceptors/WebSocket'
import {
  defineNetwork,
  type DefineNetworkOptions,
} from '#core/experimental/define-network'
import type { AnyHandler } from '#core/experimental/handlers-controller'
import { InterceptorSource } from '#core/experimental/sources/interceptor-source'
import type { SetupServer } from './glossary'
import { AsyncHandlersController } from './async-handlers-controller'
import { defineSetupServerApi } from './setup-server-common'

const defaultInterceptors: Array<Interceptor<any>> = [
  new ClientRequestInterceptor(),
  new XMLHttpRequestInterceptor(),
  new FetchInterceptor(),
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

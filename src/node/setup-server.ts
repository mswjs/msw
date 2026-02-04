import type { Interceptor } from '@mswjs/interceptors'
import { ClientRequestInterceptor } from '@mswjs/interceptors/ClientRequest'
import { XMLHttpRequestInterceptor } from '@mswjs/interceptors/XMLHttpRequest'
import { FetchInterceptor } from '@mswjs/interceptors/fetch'
import { WebSocketInterceptor } from '@mswjs/interceptors/WebSocket'
import {
  defineNetwork,
  type DefineNetworkOptions,
} from '#core/new/define-network'
import {
  type AnyHandler,
  groupHandlersByKind,
} from '#core/new/handlers-controller'
import { InterceptorSource } from '#core/new/sources/interceptor-source'
import { SetupServer } from './glossary'
import { AsyncHandlersController } from './async-handlers-controller'
import {
  createSetupServerCommonApi,
  SetupServerCommonApi,
} from './setup-server-common'

const defaultInterceptors: Array<Interceptor<any>> = [
  new ClientRequestInterceptor(),
  new XMLHttpRequestInterceptor(),
  new FetchInterceptor(),
  /**
   * @fixme WebSocketInterceptor is in a browser-only export of Interceptors
   * while the Interceptor class imported from the root module points to `lib/node`.
   * An absolute madness to solve as it requires to duplicate the build config we have
   * in MSW: shared core, CJS/ESM patching, .d.ts patching...
   */
  new WebSocketInterceptor() as any,
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

  const commonApi = createSetupServerCommonApi(network)

  return {
    ...commonApi,
    boundary(callback) {
      return (...args) => {
        const normalizedInitialHandlers = groupHandlersByKind(
          handlersController.currentHandlers,
        )

        return handlersController.context.run<any, any>(
          {
            initialHandlers: normalizedInitialHandlers,
            handlers: { ...normalizedInitialHandlers },
          },
          callback,
          ...args,
        )
      }
    },
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

  constructor(
    handlers: Array<AnyHandler>,
    interceptors: Array<Interceptor<any>>,
  ) {
    const controller = new AsyncHandlersController(handlers)
    super(interceptors, controller)

    const { sources: _, ...networkOptions } = defaultNetworkOptions
    this.network.configure(networkOptions)

    this.#handlersController = controller
  }

  public boundary<Args extends Array<any>, ReturnType>(
    callback: (...args: Args) => ReturnType,
  ): (...args: Args) => ReturnType {
    return (...args: Args): ReturnType => {
      const normalizedInitialHandlers = groupHandlersByKind(
        this.#handlersController.currentHandlers,
      )

      return this.#handlersController.context.run<any, any>(
        {
          initialHandlers: normalizedInitialHandlers,
          handlers: { ...normalizedInitialHandlers },
        },
        callback,
        ...args,
      )
    }
  }
}

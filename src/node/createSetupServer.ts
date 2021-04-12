import { bold } from 'chalk'
import { StrictEventEmitter } from 'strict-event-emitter'
import {
  createInterceptor,
  MockedResponse as MockedInterceptedResponse,
  Interceptor,
} from '@mswjs/interceptors'
import { isNodeProcess } from '../utils/internal/isNodeProcess'
import * as requestHandlerUtils from '../utils/internal/requestHandlerUtils'
import { ServerLifecycleEventsMap, SetupServerApi } from './glossary'
import { SharedOptions } from '../sharedOptions'
import { RequestHandler } from '../handlers/RequestHandler'
import { parseIsomorphicRequest } from '../utils/request/parseIsomorphicRequest'
import { handleRequest } from '../utils/handleRequest'

const DEFAULT_LISTEN_OPTIONS: SharedOptions = {
  onUnhandledRequest: 'warn',
}

/**
 * Creates a `setupServer` API using given request interceptors.
 * Useful to generate identical API using different patches to request issuing modules.
 */
export function createSetupServer(...interceptors: Interceptor[]) {
  const emitter = new StrictEventEmitter<ServerLifecycleEventsMap>()

  return function setupServer(
    ...requestHandlers: RequestHandler[]
  ): SetupServerApi {
    requestHandlers.forEach((handler) => {
      if (Array.isArray(handler))
        throw new Error(
          `[MSW] Failed to call "setupServer" given an Array of request handlers (setupServer([a, b])), expected to receive each handler individually: setupServer(a, b).`,
        )
    })

    // Store the list of request handlers for the current server instance,
    // so it could be modified at a runtime.
    let currentHandlers: RequestHandler[] = [...requestHandlers]

    // Error when attempting to run this function in a browser environment.
    if (!isNodeProcess()) {
      throw new Error(
        '[MSW] Failed to execute `setupServer` in the environment that is not Node.js (i.e. a browser). Consider using `setupWorker` instead.',
      )
    }

    let resolvedOptions: SharedOptions = {}

    const interceptor = createInterceptor({
      modules: interceptors,
      async resolver(request) {
        const mockedRequest = parseIsomorphicRequest(request)
        return handleRequest<MockedInterceptedResponse>(
          mockedRequest,
          currentHandlers,
          resolvedOptions,
          emitter,
          {
            transformResponse(response) {
              return {
                status: response.status,
                statusText: response.statusText,
                headers: response.headers.all(),
                body: response.body,
              }
            },
          },
        )
      },
    })

    interceptor.on('response', (request, response) => {
      const requestId = request.headers.get('x-msw-request-id')

      if (!requestId) {
        return
      }

      if (response.headers.get('x-powered-by') === 'msw') {
        emitter.emit('response:mocked', response, requestId)
      } else {
        emitter.emit('response:bypass', response, requestId)
      }
    })

    return {
      listen(options) {
        resolvedOptions = Object.assign({}, DEFAULT_LISTEN_OPTIONS, options)
        interceptor.apply()
      },

      use(...handlers) {
        requestHandlerUtils.use(currentHandlers, ...handlers)
      },

      restoreHandlers() {
        requestHandlerUtils.restoreHandlers(currentHandlers)
      },

      resetHandlers(...nextHandlers) {
        currentHandlers = requestHandlerUtils.resetHandlers(
          requestHandlers,
          ...nextHandlers,
        )
      },

      printHandlers() {
        currentHandlers.forEach((handler) => {
          const { header, callFrame } = handler.info
          const pragma = handler.info.hasOwnProperty('operationType')
            ? '[graphql]'
            : '[rest]'

          console.log(`\
${bold(`${pragma} ${header}`)}
  Declaration: ${callFrame}
`)
        })
      },

      on(eventType, listener) {
        emitter.addListener(eventType, listener)
      },

      close() {
        emitter.removeAllListeners()
        interceptor.restore()
      },
    }
  }
}

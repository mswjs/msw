import { bold } from 'chalk'
import { isNodeProcess } from 'is-node-process'
import { StrictEventEmitter } from 'strict-event-emitter'
import {
  BatchInterceptor,
  MockedResponse as MockedInterceptedResponse,
  Interceptor,
  HttpRequestEventMap,
} from '@mswjs/interceptors'
import * as requestHandlerUtils from '../utils/internal/requestHandlerUtils'
import { ServerLifecycleEventsMap, SetupServerApi } from './glossary'
import { SharedOptions } from '../sharedOptions'
import { RequestHandler } from '../handlers/RequestHandler'
import { handleRequest } from '../utils/handleRequest'
import { mergeRight } from '../utils/internal/mergeRight'
import { devUtils } from '../utils/internal/devUtils'
import { pipeEvents } from '../utils/internal/pipeEvents'
import { RequiredDeep } from '../typeUtils'
import { MockedRequest } from '../utils/request/MockedRequest'
import { toReadonlyArray } from '../utils/internal/toReadonlyArray'

const DEFAULT_LISTEN_OPTIONS: RequiredDeep<SharedOptions> = {
  onUnhandledRequest: 'warn',
}

/**
 * Creates a `setupServer` API using given request interceptors.
 * Useful to generate identical API using different patches to request issuing modules.
 */
export function createSetupServer(
  ...interceptors: { new (): Interceptor<HttpRequestEventMap> }[]
) {
  const emitter = new StrictEventEmitter<ServerLifecycleEventsMap>()
  const publicEmitter = new StrictEventEmitter<ServerLifecycleEventsMap>()
  pipeEvents(emitter, publicEmitter)

  return function setupServer(
    ...requestHandlers: RequestHandler[]
  ): SetupServerApi {
    requestHandlers.forEach((handler) => {
      if (Array.isArray(handler))
        throw new Error(
          devUtils.formatMessage(
            'Failed to call "setupServer" given an Array of request handlers (setupServer([a, b])), expected to receive each handler individually: setupServer(a, b).',
          ),
        )
    })

    // Store the list of request handlers for the current server instance,
    // so it could be modified at a runtime.
    let currentHandlers: RequestHandler[] = [...requestHandlers]

    // Error when attempting to run this function in a browser environment.
    if (!isNodeProcess()) {
      throw new Error(
        devUtils.formatMessage(
          'Failed to execute `setupServer` in the environment that is not Node.js (i.e. a browser). Consider using `setupWorker` instead.',
        ),
      )
    }

    let resolvedOptions = {} as RequiredDeep<SharedOptions>

    const interceptor = new BatchInterceptor({
      name: 'setup-server',
      interceptors: interceptors.map((Interceptor) => new Interceptor()),
    })

    interceptor.on('request', async function setupServerListener(request) {
      const mockedRequest = new MockedRequest(request.url, {
        ...request,
        body: await request.arrayBuffer(),
      })

      const response = await handleRequest<
        MockedInterceptedResponse & { delay?: number }
      >(mockedRequest, currentHandlers, resolvedOptions, emitter, {
        transformResponse(response) {
          return {
            status: response.status,
            statusText: response.statusText,
            headers: response.headers.all(),
            body: response.body,
            delay: response.delay,
          }
        },
      })

      if (response) {
        // Delay Node.js responses in the listener so that
        // the response lookup logic is not concerned with responding
        // in any way. The same delay is implemented in the worker.
        if (response.delay) {
          await new Promise((resolve) => {
            setTimeout(resolve, response.delay)
          })
        }

        request.respondWith(response)
      }

      return
    })

    interceptor.on('response', (request, response) => {
      if (!request.id) {
        return
      }

      if (response.headers.get('x-powered-by') === 'msw') {
        emitter.emit('response:mocked', response, request.id)
      } else {
        emitter.emit('response:bypass', response, request.id)
      }
    })

    return {
      listen(options) {
        resolvedOptions = mergeRight(
          DEFAULT_LISTEN_OPTIONS,
          options || {},
        ) as RequiredDeep<SharedOptions>
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

      listHandlers() {
        return toReadonlyArray(currentHandlers)
      },

      printHandlers() {
        const handlers = this.listHandlers()

        handlers.forEach((handler) => {
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

      events: {
        on(...args) {
          return publicEmitter.on(...args)
        },
        removeListener(...args) {
          return publicEmitter.removeListener(...args)
        },
        removeAllListeners(...args) {
          return publicEmitter.removeAllListeners(...args)
        },
      },

      close() {
        emitter.removeAllListeners()
        publicEmitter.removeAllListeners()
        interceptor.dispose()
      },
    }
  }
}

import { bold } from 'chalk'
import * as cookieUtils from 'cookie'
import { Headers, flattenHeadersObject } from 'headers-utils'
import { StrictEventEmitter } from 'strict-event-emitter'
import {
  RequestInterceptor,
  MockedResponse as MockedInterceptedResponse,
  Interceptor,
} from 'node-request-interceptor'
import { getResponse } from '../utils/getResponse'
import { parseBody } from '../utils/request/parseBody'
import { isNodeProcess } from '../utils/internal/isNodeProcess'
import * as requestHandlerUtils from '../utils/internal/requestHandlerUtils'
import { onUnhandledRequest } from '../utils/request/onUnhandledRequest'
import { ServerLifecycleEventsMap, SetupServerApi } from './glossary'
import { SharedOptions } from '../sharedOptions'
import { uuidv4 } from '../utils/internal/uuidv4'
import { MockedRequest, RequestHandler } from '../handlers/RequestHandler'
import { setRequestCookies } from '../utils/request/setRequestCookies'
import { readResponseCookies } from '../utils/request/readResponseCookies'

const DEFAULT_LISTEN_OPTIONS: SharedOptions = {
  onUnhandledRequest: 'bypass',
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
    const interceptor = new RequestInterceptor(interceptors)

    // Error when attempting to run this function in a browser environment.
    if (!isNodeProcess()) {
      throw new Error(
        '[MSW] Failed to execute `setupServer` in the environment that is not Node.js (i.e. a browser). Consider using `setupWorker` instead.',
      )
    }

    // Store the list of request handlers for the current server instance,
    // so it could be modified at a runtime.
    let currentHandlers: RequestHandler[] = [...requestHandlers]

    interceptor.on('response', (request, response) => {
      const requestId = request.headers?.['x-msw-request-id'] as string

      if (response.headers['x-powered-by'] === 'msw') {
        emitter.emit('response:mocked', response, requestId)
      } else {
        emitter.emit('response:bypass', response, requestId)
      }
    })

    return {
      listen(options) {
        const resolvedOptions = Object.assign(
          {},
          DEFAULT_LISTEN_OPTIONS,
          options,
        )

        interceptor.use(async (request) => {
          const requestId = uuidv4()

          const requestHeaders = new Headers(
            flattenHeadersObject(request.headers || {}),
          )

          if (request.headers) {
            request.headers['x-msw-request-id'] = requestId
          }

          const requestCookieString = requestHeaders.get('cookie')

          const mockedRequest: MockedRequest = {
            id: requestId,
            url: request.url,
            method: request.method,
            // Parse the request's body based on the "Content-Type" header.
            body: parseBody(request.body, requestHeaders),
            headers: requestHeaders,
            cookies: {},
            redirect: 'manual',
            referrer: '',
            keepalive: false,
            cache: 'default',
            mode: 'cors',
            referrerPolicy: 'no-referrer',
            integrity: '',
            destination: 'document',
            bodyUsed: false,
            credentials: 'same-origin',
          }

          // Attach all the cookies stored in the virtual cookie store.
          setRequestCookies(mockedRequest)

          if (requestCookieString) {
            // Set mocked request cookies from the `cookie` header of the original request.
            // No need to take `credentials` into account, because in Node.js requests are intercepted
            // _after_ they happen. Request issuer should have already taken care of sending relevant cookies.
            // Unlike browser, where interception is on the worker level, _before_ the request happens.
            mockedRequest.cookies = cookieUtils.parse(requestCookieString)
          }

          emitter.emit('request:start', mockedRequest)

          if (mockedRequest.headers.get('x-msw-bypass')) {
            emitter.emit('request:end', mockedRequest)
            return
          }

          const { response, handler } = await getResponse(
            mockedRequest,
            currentHandlers,
          )

          if (!handler) {
            emitter.emit('request:unhandled', mockedRequest)
          }

          if (!response) {
            emitter.emit('request:end', mockedRequest)

            onUnhandledRequest(
              mockedRequest,
              currentHandlers,
              resolvedOptions.onUnhandledRequest,
            )
            return
          }

          emitter.emit('request:match', mockedRequest)

          return new Promise<MockedInterceptedResponse>((resolve) => {
            const mockedResponse = {
              status: response.status,
              statusText: response.statusText,
              headers: response.headers.getAllHeaders(),
              body: response.body as string,
            }

            // Store all the received response cookies in the virtual cookie store.
            readResponseCookies(mockedRequest, response)

            // the node build will use the timers module to ensure @sinon/fake-timers or jest fake timers
            // don't affect this timeout.
            setTimeout(() => {
              resolve(mockedResponse)
            }, response.delay ?? 0)

            emitter.emit('request:end', mockedRequest)
          })
        })
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

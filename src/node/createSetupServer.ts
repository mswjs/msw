import * as cookieUtils from 'cookie'
import { bold } from 'chalk'
import { Headers, flattenHeadersObject } from 'headers-utils'
import { StrictEventEmitter } from 'strict-event-emitter'
import {
  RequestInterceptor,
  MockedResponse as MockedInterceptedResponse,
  Interceptor,
} from 'node-request-interceptor'
import { RequestHandlersList } from '../setupWorker/glossary'
import { MockedRequest } from '../utils/handlers/requestHandler'
import { getResponse } from '../utils/getResponse'
import { parseBody } from '../utils/request/parseBody'
import { isNodeProcess } from '../utils/internal/isNodeProcess'
import * as requestHandlerUtils from '../utils/handlers/requestHandlerUtils'
import { onUnhandledRequest } from '../utils/request/onUnhandledRequest'
import { ServerLifecycleEventsMap, SetupServerApi } from './glossary'
import { SharedOptions } from '../sharedOptions'
import { uuidv4 } from '../utils/internal/uuidv4'

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
    ...requestHandlers: RequestHandlersList
  ): SetupServerApi {
    requestHandlers.forEach((handler) => {
      if (Array.isArray(handler))
        throw new Error(
          `[MSW] Failed to call "setupServer" given an Array of request handlers (setupServer([a, b])), expected to receive each handler individually: setupServer(a, b).`,
        )
    })
    const interceptor = new RequestInterceptor(interceptors)
    const pendingRequests = new Map<string, NodeJS.Timeout>()

    // Error when attempting to run this function in a browser environment.
    if (!isNodeProcess()) {
      throw new Error(
        '[MSW] Failed to execute `setupServer` in the environment that is not NodeJS (i.e. a browser). Consider using `setupWorker` instead.',
      )
    }

    // Store the list of request handlers for the current server instance,
    // so it could be modified at a runtime.
    let currentHandlers: RequestHandlersList = [...requestHandlers]

    interceptor.on('response', (req, res) => {
      const requestId = req.headers?.['x-msw-request-id'] as string

      if (res.headers['x-powered-by'] === 'msw') {
        emitter.emit('response:mocked', res, requestId)
      } else {
        emitter.emit('response:bypass', res, requestId)
      }
    })

    return {
      listen(options) {
        const resolvedOptions = Object.assign(
          {},
          DEFAULT_LISTEN_OPTIONS,
          options,
        )

        interceptor.use(async (req) => {
          const requestId = uuidv4()

          const requestHeaders = new Headers(
            flattenHeadersObject(req.headers || {}),
          )

          if (req.headers) {
            req.headers['x-msw-request-id'] = requestId
          }

          const requestCookieString = requestHeaders.get('cookie')

          const mockedRequest: MockedRequest = {
            id: requestId,
            url: req.url,
            method: req.method,
            // Parse the request's body based on the "Content-Type" header.
            body: parseBody(req.body, requestHeaders),
            headers: requestHeaders,
            cookies: {},
            params: {},
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

          emitter.emit('request:start', mockedRequest)

          if (requestCookieString) {
            // Set mocked request cookies from the `cookie` header of the original request.
            // No need to take `credentials` into account, because in NodeJS requests are intercepted
            // _after_ they happen. Request issuer should have already taken care of sending relevant cookies.
            // Unlike browser, where interception is on the worker level, _before_ the request happens.
            mockedRequest.cookies = cookieUtils.parse(requestCookieString)
          }

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

            // the node build will use the timers module to ensure @sinon/fake-timers or jest fake timers
            // don't affect this timeout.
            const responseTimeout = setTimeout(() => {
              // Only resolve when the request is still relevant
              if (pendingRequests.has(mockedRequest.id)) {
                resolve(mockedResponse)
                pendingRequests.delete(mockedRequest.id)
              }
            }, response.delay ?? 0)
            pendingRequests.set(mockedRequest.id, responseTimeout)
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
        // Clear pending requests
        // Otherwise this causes previous requests to resolve when a test has already finished
        pendingRequests.forEach(clearTimeout)
        pendingRequests.clear()

        currentHandlers = requestHandlerUtils.resetHandlers(
          requestHandlers,
          ...nextHandlers,
        )
      },

      printHandlers() {
        currentHandlers.forEach((handler) => {
          const meta = handler.getMetaInfo()

          console.log(`\
${bold(`[${meta.type}] ${meta.header}`)}
  Declaration: ${meta.callFrame}
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

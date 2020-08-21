import * as cookieUtils from 'cookie'
import { Headers, flattenHeadersObject } from 'headers-utils'
import {
  RequestInterceptor,
  MockedResponse as MockedInterceptedResponse,
} from 'node-request-interceptor'
import { RequestHandlersList } from '../setupWorker/glossary'
import { MockedRequest } from '../utils/handlers/requestHandler'
import { getResponse } from '../utils/getResponse'
import { parseBody } from '../utils/request/parseBody'
import { isNodeProcess } from '../utils/internal/isNodeProcess'
import * as requestHandlerUtils from '../utils/handlers/requestHandlerUtils'
import { SharedOptions } from '../sharedOptions'
import { onUnhandledRequest } from '../onUnhandledRequest'

type ListenOptions = SharedOptions

const DEFAULT_LISTEN_OPTIONS: ListenOptions = {
  onUnhandledRequest: 'bypass',
}

/**
 * Sets up a server-side requests interception with the given mock definition.
 */
export const setupServer = (...requestHandlers: RequestHandlersList) => {
  const interceptor = new RequestInterceptor()

  // Error when attempting to run this function in a browser environment.
  if (!isNodeProcess()) {
    throw new Error(
      '[MSW] Failed to execute `setupServer` in the environment that is not NodeJS (i.e. a browser). Consider using `setupWorker` instead.',
    )
  }

  // Store the list of request handlers for the current server instance,
  // so it could be modified at a runtime.
  let currentHandlers: RequestHandlersList = [...requestHandlers]

  return {
    /**
     * Enables requests interception based on the previously provided mock definition.
     */
    listen(options?: ListenOptions) {
      const resolvedOptions = Object.assign({}, DEFAULT_LISTEN_OPTIONS, options)

      interceptor.use(async (req) => {
        const requestHeaders = new Headers(
          flattenHeadersObject(req.headers || {}),
        )
        const requestCookieString = requestHeaders.get('cookie')

        const mockedRequest: MockedRequest = {
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

        if (requestCookieString) {
          // Set mocked request cookies from the `cookie` header of the original request.
          // No need to take `credentials` into account, because in NodeJS requests are intercepted
          // _after_ they happen. Request issuer should have already taken care of sending relevant cookies.
          // Unlike browser, where interception is on the worker level, _before_ the request happens.
          mockedRequest.cookies = cookieUtils.parse(requestCookieString)
        }

        if (mockedRequest.headers.get('x-msw-bypass')) {
          return
        }

        const { response } = await getResponse(mockedRequest, currentHandlers)

        if (!response) {
          onUnhandledRequest(mockedRequest, resolvedOptions.onUnhandledRequest)
          return
        }

        return new Promise<MockedInterceptedResponse>((resolve) => {
          // the node build will use the timers module to ensure @sinon/fake-timers or jest fake timers
          // don't affect this timeout.
          setTimeout(() => {
            resolve({
              status: response.status,
              statusText: response.statusText,
              headers: response.headers.getAllHeaders(),
              body: response.body,
            })
          }, response.delay ?? 0)
        })
      })
    },

    /**
     * Prepends given request handlers to the list of existing handlers.
     */
    use(...handlers: RequestHandlersList) {
      requestHandlerUtils.use(currentHandlers, ...handlers)
    },

    /**
     * Marks all request handlers that respond using `res.once()` as unused.
     */
    restoreHandlers() {
      requestHandlerUtils.restoreHandlers(currentHandlers)
    },

    /**
     * Resets request handlers to the initial list given to the `setupServer` call, or to the explicit next request handlers list, if given.
     */
    resetHandlers(...nextHandlers: RequestHandlersList) {
      currentHandlers = requestHandlerUtils.resetHandlers(
        requestHandlers,
        ...nextHandlers,
      )
    },

    /**
     * Stops requests interception by restoring all augmented modules.
     */
    close() {
      interceptor.restore()
    },
  }
}

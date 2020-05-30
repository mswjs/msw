import { Headers, flattenHeadersObject } from 'headers-utils'
import {
  RequestInterceptor,
  MockedResponse as MockedInterceptedResponse,
} from 'node-request-interceptor'
import { RequestHandlersList } from '../setupWorker/glossary'
import { MockedRequest } from '../handlers/requestHandler'
import { getResponse } from '../utils/getResponse'
import { parseRequestBody } from '../utils/parseRequestBody'

/**
 * Sets up a server-side requests interception with the given mock definition.
 */
export const setupServer = (...requestHandlers: RequestHandlersList) => {
  const interceptor = new RequestInterceptor()

  // Store the list of request handlers for the current server instance,
  // so it could be modified at a runtime.
  let currentHandlers: RequestHandlersList = [...requestHandlers]

  return {
    /**
     * Enables requests interception based on the previously provided mock definition.
     */
    listen() {
      interceptor.use(async (req) => {
        const requestHeaders = new Headers(
          flattenHeadersObject(req.headers || {}),
        )

        const mockedRequest: MockedRequest = {
          url: req.url,
          method: req.method,
          // Parse the request's body based on the "Content-Type" header.
          body: parseRequestBody(req.body, requestHeaders),
          headers: requestHeaders,
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

        const { response } = await getResponse(mockedRequest, currentHandlers)

        if (!response) {
          // Return nothing, if no mocked response associated with this request.
          // That makes `node-request-interceptor` to perform the request as-is.
          return
        }

        return new Promise<MockedInterceptedResponse>((resolve) => {
          setTimeout(() => {
            resolve({
              status: response.status,
              statusText: response.statusText,
              headers: response.headers.getAllHeaders(),
              body: response.body,
            })
          }, response.delay)
        })
      })
    },

    /**
     * Prepends given request handlers to the list of existing handlers.
     */
    use(...handlers: RequestHandlersList) {
      currentHandlers.unshift(...handlers)
    },

    /**
     * Marks all request handlers that respond using `res.once()` as unused.
     */
    restoreHandlers() {
      currentHandlers.forEach((handler) => {
        if (handler.hasOwnProperty('shouldSkip')) {
          handler.shouldSkip = false
        }
      })
    },

    /**
     * Resets request handlers to the initial list given to the `setupServer` call, or to the explicit next request handlers list, if given.
     */
    resetHandlers(...nextHandlers: RequestHandlersList) {
      currentHandlers =
        nextHandlers.length > 0 ? [...nextHandlers] : [...requestHandlers]
    },

    /**
     * Stops requests interception by restoring all augmented modules.
     */
    close() {
      interceptor.restore()
    },
  }
}

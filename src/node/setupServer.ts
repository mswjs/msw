import { Headers, flattenHeadersObject } from 'headers-utils'
import {
  RequestInterceptor,
  MockedResponse as MockedInterceptedResponse,
} from 'node-request-interceptor'
import { RequestHandler, MockedRequest } from '../handlers/requestHandler'
import { getResponse } from '../utils/getResponse'
import { parseRequestBody } from '../utils/parseRequestBody'

type RequestHandlersList = RequestHandler<any, any>[]

/**
 * Sets up a server-side requests interception with the given mock definition.
 */
export const setupServer = (...handlers: RequestHandlersList) => {
  const interceptor = new RequestInterceptor()

  // Store the list of request handlers for the current server instance,
  // so it could be modified at a runtime.
  let currentHandlers: RequestHandlersList = [...handlers]

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
     * Resets request handlers to the initial list given to the `setupServer` call.
     */
    resetHandlers() {
      currentHandlers = [...handlers]
    },

    /**
     * Stops requests interception by restoring all augmented modules.
     */
    close() {
      interceptor.restore()
    },
  }
}

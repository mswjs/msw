import { Headers, flattenHeadersObject } from 'headers-utils'
import {
  RequestInterceptor,
  MockedResponse as MockedInterceptedResponse,
} from 'node-request-interceptor'
import { RequestHandler, MockedRequest } from '../handlers/requestHandler'
import { getResponse } from '../utils/getResponse'
import { parseRequestBody } from '../utils/parseRequestBody'

/**
 * Sets up a server-side requests interception with the given mock definition.
 */
export const setupServer = (...handlers: RequestHandler<any, any>[]) => {
  let interceptor: RequestInterceptor

  return {
    /**
     * Enables requests interception based on the previously provided mock definition.
     */
    listen() {
      interceptor = new RequestInterceptor()
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

        const { response } = await getResponse(mockedRequest, handlers)

        if (!response) {
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
     * Stops requests interception by restoring all augmented modules.
     */
    close() {
      interceptor.restore()
    },
  }
}

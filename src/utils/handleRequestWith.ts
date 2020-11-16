import parseSetCookie from 'set-cookie-parser'
import { Headers, headersToList } from 'headers-utils'
import { cookieStore } from '../cookie-store'
import {
  StartOptions,
  ResponseWithSerializedHeaders,
  SetupWorkerInternalContext,
} from '../setupWorker/glossary'
import { MockedRequest } from './handlers/requestHandler'
import {
  ServiceWorkerMessage,
  createBroadcastChannel,
} from '../utils/createBroadcastChannel'
import { getResponse } from '../utils/getResponse'
import { onUnhandledRequest } from './request/onUnhandledRequest'
import { parseBody } from './request/parseBody'
import { getRequestCookies } from './request/getRequestCookies'
import { isStringEqual } from './internal/isStringEqual'
import { NetworkError } from './NetworkError'

export const handleRequestWith = (
  context: SetupWorkerInternalContext,
  options: StartOptions,
) => {
  return async (event: MessageEvent) => {
    const channel = createBroadcastChannel(event)

    try {
      const message: ServiceWorkerMessage<MockedRequest> = JSON.parse(
        event.data,
        function (this: MockedRequest, key, value) {
          if (key === 'url') {
            return new URL(value)
          }

          // Serialize headers
          if (key === 'headers') {
            return new Headers(value)
          }

          // Prevent empty fields from presering an empty value.
          // It's invalid to perform a GET request with { body: "" }
          if (
            // Check if we are parsing deeper in `event.data.payload`,
            // because this custom JSON parser is invoked for each depth level.
            this.method &&
            isStringEqual(this.method, 'GET') &&
            key === 'body' &&
            value === ''
          ) {
            return undefined
          }

          return value
        },
      )

      const { type, payload: req } = message

      // Ignore irrelevant worker message types
      if (type !== 'REQUEST') {
        return null
      }

      // Parse the request's body based on the "Content-Type" header.
      req.body = parseBody(req.body, req.headers)

      // Set document cookies on the request.
      req.cookies = getRequestCookies(req)
      req.headers.set(
        'cookie',
        Object.entries(req.cookies)
          .map(([name, value]) => `${name}=${value}`)
          .join('; '),
      )

      const {
        response,
        handler,
        publicRequest,
        parsedRequest,
      } = await getResponse(req, context.requestHandlers)

      // Handle a scenario when there is no request handler
      // found for a given request.
      if (!handler) {
        onUnhandledRequest(req, options.onUnhandledRequest)

        return channel.send({ type: 'MOCK_NOT_FOUND' })
      }

      // Handle a scenario when there is a request handler,
      // but it doesn't return any mocked response.
      if (!response) {
        console.warn(
          '[MSW] Expected a mocking resolver function to return a mocked response Object, but got: %s. Original response is going to be used instead.',
          response,
        )

        return channel.send({ type: 'MOCK_NOT_FOUND' })
      }

      const cookieString = response.headers.get('set-cookie')

      if (req.credentials !== 'omit' && cookieString) {
        const cookies = parseSetCookie(cookieString)
        const cookieEntries = cookies.map(
          ({ maxAge, name, ...cookie }) =>
            [
              name,
              {
                ...cookie,
                expires:
                  maxAge === undefined
                    ? cookie.expires
                    : new Date(Date.now() + maxAge * 1000),
                maxAge: undefined,
              },
            ] as const,
        )
        const cookiesOfOrigin = cookieStore.get(req.url.origin)

        if (cookiesOfOrigin) {
          cookieEntries.forEach(([name, cookie]) =>
            cookiesOfOrigin.set(name, cookie),
          )
        } else {
          cookieStore.set(req.url.origin, new Map(cookieEntries))
        }

        localStorage.setItem(
          '_MSW_COOKIE_STORE',
          JSON.stringify(
            Array.from(cookieStore.entries()).map(([origin, cookies]) => [
              origin,
              Array.from(cookies.entries()),
            ]),
          ),
        )
      }

      const responseWithSerializedHeaders: ResponseWithSerializedHeaders = {
        ...response,
        headers: headersToList(response.headers),
      }

      if (!options.quiet) {
        setTimeout(() => {
          handler.log(
            publicRequest,
            responseWithSerializedHeaders,
            handler,
            parsedRequest,
          )
        }, response.delay)
      }

      channel.send({
        type: 'MOCK_SUCCESS',
        payload: responseWithSerializedHeaders,
      })
    } catch (error) {
      if (error instanceof NetworkError) {
        // Treat emulated network error differently,
        // as it is an intended exception in a request handler.
        return channel.send({
          type: 'NETWORK_ERROR',
          payload: {
            name: error.name,
            message: error.message,
          },
        })
      }

      // Treat all the other exceptions in a request handler
      // as unintended, alerting that there is a problem needs fixing.
      channel.send({
        type: 'INTERNAL_ERROR',
        payload: {
          status: 500,
          body: JSON.stringify({
            errorType: error.constructor.name,
            message: error.message,
            location: error.stack,
          }),
        },
      })
    }
  }
}

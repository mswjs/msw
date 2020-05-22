import { Headers, headersToList } from 'headers-utils'
import {
  StartOptions,
  ResponseWithSerializedHeaders,
} from '../setupWorker/glossary'
import { MockedRequest, RequestHandler } from '../handlers/requestHandler'
import {
  ServiceWorkerMessage,
  createBroadcastChannel,
} from '../utils/createBroadcastChannel'
import { getResponse } from '../utils/getResponse'
import { parseRequestBody } from './parseRequestBody'
import { isStringEqual } from './isStringEqual'

export const handleRequestWith = (
  requestHandlers: RequestHandler[],
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
      req.body = parseRequestBody(req.body, req.headers)

      const {
        response,
        handler,
        publicRequest,
        parsedRequest,
      } = await getResponse(req, requestHandlers)

      // Handle a scenario when there is no request handler
      // found for a given request.
      if (!handler) {
        return channel.send({ type: 'MOCK_NOT_FOUND' })
      }

      // Handle a scenario when there is a request handler,
      // but its response resolver didn't return any response.
      if (!response) {
        console.warn(
          '[MSW] Expected a mocking resolver function to return a mocked response Object, but got: %s. Original response is going to be used instead.',
          response,
        )

        return channel.send({ type: 'MOCK_NOT_FOUND' })
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

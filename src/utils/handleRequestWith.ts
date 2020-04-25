import { StartOptions } from '../setupWorker/glossary'
import { MockedRequest, RequestHandler } from '../handlers/requestHandler'
import {
  ServiceWorkerMessage,
  createBroadcastChannel,
} from '../utils/createBroadcastChannel'
import { getResponse } from '../utils/getResponse'
import { log } from './logger'

export const handleRequestWith = (
  requestHandlers: RequestHandler[],
  options: StartOptions,
) => {
  return async (event: MessageEvent) => {
    const channel = createBroadcastChannel(event)

    try {
      const message: ServiceWorkerMessage<MockedRequest> = JSON.parse(
        event.data,
        (key, value) => {
          // Serialize headers
          if (key === 'headers') {
            return new Headers(value)
          }

          // Prevent empty fields from presering an empty value.
          // It's invalid to perform a GET request with { body: "" }
          if (value === '') {
            return undefined
          }

          return value
        },
      )

      const { type, payload: req } = message

      // Ignore worker irrelevant worker messages
      if (type !== 'REQUEST') {
        return null
      }

      const { response, handler } = await getResponse(req, requestHandlers)

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

      if (!options.quiet) {
        log(req, response, handler)
      }

      channel.send({
        type: 'MOCK_SUCCESS',
        payload: response,
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

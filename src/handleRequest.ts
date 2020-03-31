import { match } from 'node-match-path'
import { MockedResponse, response } from './response'
import {
  MockedRequest,
  RequestHandler,
  defaultContext,
} from './handlers/requestHandler'
import { resolveRelativeUrl } from './utils/resolveRelativeUrl'
import {
  ServiceWorkerMessage,
  createBroadcastChannel,
} from './utils/createBroadcastChannel'

export const handleRequestWith = (requestHandlers: RequestHandler[]) => {
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

      if (type !== 'REQUEST') {
        return null
      }

      const parsedUrl = new URL(req.url)
      req.query = parsedUrl.searchParams

      const relevantRequestHandler = requestHandlers.find((requestHandler) => {
        return requestHandler.predicate(req, parsedUrl)
      })

      if (relevantRequestHandler == null) {
        return channel.send({ type: 'MOCK_NOT_FOUND' })
      }

      const { mask, defineContext, resolver } = relevantRequestHandler

      // Retrieve request URL parameters based on the provided mask
      const params =
        (mask && match(resolveRelativeUrl(mask), req.url).params) || {}

      const requestWithParams: MockedRequest = {
        ...req,
        params,
      }

      const context = defineContext
        ? defineContext(requestWithParams)
        : defaultContext

      const mockedResponse: MockedResponse | undefined = await resolver(
        requestWithParams,
        response,
        context,
      )

      if (!mockedResponse) {
        console.warn(
          '[MSW] Expected a mocking resolver function to return a mocked response Object, but got: %s. Original response is going to be used instead.',
          mockedResponse,
        )

        return channel.send({ type: 'MOCK_NOT_FOUND' })
      }

      // Transform Headers into a list to be stringified preserving multiple
      // header keys. Stringified list is then parsed inside the ServiceWorker.
      const responseWithHeaders = {
        ...mockedResponse,
        // @ts-ignore
        headers: Array.from(mockedResponse.headers.entries()),
      }

      channel.send({
        type: 'MOCK_SUCCESS',
        payload: responseWithHeaders,
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

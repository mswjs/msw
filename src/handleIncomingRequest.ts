import { match } from 'node-match-path'
import { MockedResponse, response } from './response'
import {
  MockedRequest,
  RequestHandler,
  defaultContext,
} from './handlers/requestHandler'
import { resolveRequestMask } from './utils/resolveRequestMask'

const sendToWorker = (event: MessageEvent, message: string) => {
  const port = event.ports[0]

  if (port) {
    port.postMessage(message)
  }
}

export const createIncomingRequestHandler = (
  requestHandlers: RequestHandler[],
) => {
  return async (event: MessageEvent) => {
    const req: MockedRequest = JSON.parse(event.data, (key, value) => {
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
    })

    const relevantRequestHandler = requestHandlers.find((requestHandler) => {
      return requestHandler.predicate(req)
    })

    if (relevantRequestHandler == null) {
      return sendToWorker(event, 'MOCK_NOT_FOUND')
    }

    const { mask, defineContext, resolver } = relevantRequestHandler

    // Retrieve request URL parameters based on the provided mask
    const params =
      (mask && match(resolveRequestMask(mask), req.url).params) || {}

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

      return sendToWorker(event, 'MOCK_NOT_FOUND')
    }

    // Transform Headers into a list to be stringified preserving multiple
    // header keys. Stringified list is then parsed inside the ServiceWorker.
    const responseWithHeaders = {
      ...mockedResponse,
      // @ts-ignore
      headers: Array.from(mockedResponse.headers.entries()),
    }

    sendToWorker(event, JSON.stringify(responseWithHeaders))
  }
}

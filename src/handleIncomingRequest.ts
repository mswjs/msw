import { match } from 'node-match-path'
import { MockedResponse, response } from './response'
import { context } from './context'
import { RequestHandler } from './handlers/requestHandler'

const sendToWorker = (event: MessageEvent, message: string) => {
  const port = event.ports[0]

  if (port) {
    port.postMessage(message)
  }
}

export const createIncomingRequestHandler = (
  requestHandlers: RequestHandler[],
) => {
  return (event: MessageEvent): void => {
    const req: Request = JSON.parse(event.data, (key, value) => {
      return key === 'headers' ? new Headers(value) : value
    })

    const relevantRequestHandler = requestHandlers.find((requestHandler) => {
      return requestHandler.predicate(req)
    })

    if (relevantRequestHandler == null) {
      return sendToWorker(event, 'MOCK_NOT_FOUND')
    }

    // Retrieve request URL parameters based on the provided mask
    const params = relevantRequestHandler.mask
      ? match(relevantRequestHandler.mask, req.url).params
      : {}

    const requestWithParams = {
      ...req,
      params,
    }

    const mockedResponse:
      | MockedResponse
      | undefined = relevantRequestHandler.resolver(
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

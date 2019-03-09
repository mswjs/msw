import res, { MockedResponse } from '../response'
import context from '../context'
import { MockingSchema } from '../composeMocks'
import { SchemaEntryBody } from '../handlers/createHandler'
import { FullMatch } from './matchPath'

const postMessageToWorker = (event: MessageEvent, message: string) => {
  const port = event.ports[0]
  port && port.postMessage(message)
}

const interceptRequest = (schema: MockingSchema) => (
  event: MessageEvent,
): void => {
  const req: Request = JSON.parse(event.data, (key, value) => {
    return key === 'headers' ? new Headers(value) : value
  })
  const routesByMethod: SchemaEntryBody[] =
    schema[req.method.toLowerCase()] || []

  /** Get the result of a match */
  const exactMatch = routesByMethod.reduce<[SchemaEntryBody, FullMatch]>(
    (found, schemaEntry) => {
      if (found) {
        return found
      }

      const fullMatch = schemaEntry.match(req.url)
      return fullMatch.matches ? [schemaEntry, fullMatch] : null
    },
    null,
  )

  if (exactMatch === null) {
    return postMessageToWorker(event, 'MOCK_NOT_FOUND')
  }

  const [route, fullMatch] = exactMatch

  const resolvedReq = {
    ...req,
    params: fullMatch.params,
  }
  const mockedResponse: MockedResponse | undefined = route.resolver(
    resolvedReq,
    res,
    context,
  )

  if (!mockedResponse) {
    console.warn(
      '[MSW] Expected a mocking resolver function to return a mocked response Object, but got: %s.',
      mockedResponse,
    )
  }

  /**
   * Transform Headers into a list to be stringified preserving multiple
   * header keys. Stringified list is then parsed inside the ServiceWorker.
   */
  const responseWithHeaders = {
    ...mockedResponse,
    // @ts-ignore
    headers: Array.from(mockedResponse.headers.entries()),
  }

  postMessageToWorker(event, JSON.stringify(responseWithHeaders))
}

export default interceptRequest

import { MockedRequest, RequestHandler } from '../../handlers/requestHandler'
import { ResponseWithSerializedHeaders } from '../../setupWorker/glossary'
import { parseQuery } from './parseQuery'
import { getTimestamp } from '../logger/getTimestamp'
import { styleStatusCode } from '../logger/styleStatusCode'
import { prepareRequest } from '../logger/prepareRequest'
import { prepareResponse } from '../logger/prepareResponse'

export function logGraphQLRequest<RequestType, ContextType>(
  req: MockedRequest,
  res: ResponseWithSerializedHeaders,
  handler: RequestHandler<RequestType, ContextType>,
) {
  const { query } = req.body as Record<string, string>
  const { operationName } = parseQuery(query, 'query')

  const loggedRequest = prepareRequest(req)
  const loggedResponse = prepareResponse(res)

  console.groupCollapsed(
    '[MSW] %s %s (%c%s%c)',
    getTimestamp(),
    operationName,
    styleStatusCode(res.status),
    res.status,
    'color:inherit',
  )
  console.log('Request:', loggedRequest)
  console.log('Handler:', handler)
  console.log('Response:', loggedResponse)
  console.groupEnd()
}

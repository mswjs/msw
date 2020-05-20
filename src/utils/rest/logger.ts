import { format } from 'url'
import { MockedRequest, RequestHandler } from '../../handlers/requestHandler'
import { ResponseWithSerializedHeaders } from '../../setupWorker/glossary'
import { getTimestamp } from '../logger/getTimestamp'
import { styleStatusCode } from '../logger/styleStatusCode'
import { prepareRequest } from '../logger/prepareRequest'
import { prepareResponse } from '../logger/prepareResponse'

export function logRestRequest<RequestType, ContextType>(
  req: MockedRequest,
  res: ResponseWithSerializedHeaders,
  handler: RequestHandler<RequestType, ContextType>,
) {
  const isRelativeRequest = req.referrer.startsWith(req.url.origin)
  const publicUrl = isRelativeRequest
    ? req.url.pathname
    : format({
        protocol: req.url.protocol,
        host: req.url.host,
        pathname: req.url.pathname,
      })

  const loggedRequest = prepareRequest(req)
  const loggedResponse = prepareResponse(res)

  console.groupCollapsed(
    '[MSW] %s %s %s (%c%s%c)',
    getTimestamp(),
    req.method,
    publicUrl,
    styleStatusCode(res.status),
    res.status,
    'color:inherit',
  )
  console.log('Request', loggedRequest)
  console.log('Handler:', {
    mask: handler.mask,
    resolver: handler.resolver,
  })
  console.log('Response', loggedResponse)
  console.groupEnd()
}

import { format } from 'url'
import { listToHeaders } from 'headers-utils'
import { MockedRequest, RequestHandler } from '../handlers/requestHandler'
import { ResponseWithSerializedHeaders } from '../setupWorker/glossary'
import { getTimestamp } from './getTimestamp'
import { styleStatusCode } from './styleStatusCode'
import { getJsonBody } from './getJsonBody'

export const log = (
  req: MockedRequest,
  res: ResponseWithSerializedHeaders,
  handler: RequestHandler<any>,
) => {
  const isRelativeRequest = req.referrer.startsWith(req.url.origin)
  const publicUrl = isRelativeRequest
    ? req.url.pathname
    : format({
        protocol: req.url.protocol,
        host: req.url.host,
        pathname: req.url.pathname,
      })

  const requestWithHeaders = {
    ...req,
    headers: req.headers.getAllHeaders(),
  }

  const resHeaders = listToHeaders(res.headers)
  const responsePreview = {
    ...res,
    // Parse a response JSON body for preview in the logs
    body: resHeaders.get('content-type')?.includes('json')
      ? getJsonBody(res.body)
      : res.body,
  }

  setTimeout(() => {
    console.groupCollapsed(
      '[MSW] %s %s %s (%c%s%c)',
      getTimestamp(),
      req.method,
      publicUrl,
      styleStatusCode(res.status),
      res.status,
      'color:inherit',
    )
    console.log('Request', requestWithHeaders)
    console.log('Handler:', {
      mask: handler.mask,
      resolver: handler.resolver,
    })
    console.log('Response', responsePreview)
    console.groupEnd()
  }, res.delay)
}

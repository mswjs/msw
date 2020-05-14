import { parse, format } from 'url'
import { MockedRequest, RequestHandler } from '../handlers/requestHandler'
import { ResponseWithHeaders } from '../setupWorker/glossary'
import { getTimestamp } from './getTimestamp'
import { styleStatusCode } from './styleStatusCode'

export const log = (
  req: MockedRequest,
  res: ResponseWithHeaders,
  handler: RequestHandler<any>,
) => {
  const isLocal = req.url.startsWith(req.referrer)
  const parsedUrl = parse(req.url)
  const publicUrl = isLocal
    ? parsedUrl.pathname
    : format({
        protocol: parsedUrl.protocol,
        host: parsedUrl.host,
        pathname: parsedUrl.pathname,
      })
  const requestWithHeaders = {
    ...req,
    headers: req.headers.getAllHeaders(),
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
    console.log('Response', res)
    console.groupEnd()
  }, res.delay)
}

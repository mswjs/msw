import url from 'url'
import { MockedRequest, RequestHandler } from './handlers/requestHandler'
import { MockedResponse } from './response'
import { getTimestamp } from './utils/getTimestamp'
import { styleStatusCode } from './utils/styleStatusCode'

export const log = (
  req: MockedRequest,
  res: MockedResponse,
  handler: RequestHandler<any>,
) => {
  const isLocal = req.url.startsWith(req.referrer)
  const parsedUrl = url.parse(req.url)
  const publicUrl = isLocal
    ? parsedUrl.pathname
    : url.format({
        protocol: parsedUrl.protocol,
        host: parsedUrl.host,
        pathname: parsedUrl.pathname,
      })

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
    console.log('Request', req)
    console.log('Handler:', {
      mask: handler.mask,
      resolver: handler.resolver,
    })
    console.log('Response', res)
    console.groupEnd()
  }, res.delay)
}

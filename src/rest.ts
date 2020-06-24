import { format } from 'url'
import { match } from 'node-match-path'
import { getCleanUrl } from 'node-request-interceptor/lib/utils/getCleanUrl'
import {
  RequestHandler,
  ResponseResolver,
  MockedRequest,
} from './handlers/requestHandler'
import { Mask } from './setupWorker/glossary'
import { set } from './context/set'
import { status } from './context/status'
import { cookie } from './context/cookie'
import { body } from './context/body'
import { text } from './context/text'
import { json } from './context/json'
import { xml } from './context/xml'
import { delay } from './context/delay'
import { fetch } from './context/fetch'

/* Logging */
import { resolveRelativeUrl } from './utils/resolveRelativeUrl'
import { prepareRequest } from './utils/logger/prepareRequest'
import { prepareResponse } from './utils/logger/prepareResponse'
import { getTimestamp } from './utils/logger/getTimestamp'
import { getStatusCodeColor } from './utils/logger/getStatusCodeColor'
import { isStringEqual } from './utils/isStringEqual'
import { resolveMask } from './utils/resolveMask'

export enum RESTMethods {
  GET = 'GET',
  POST = 'POST',
  PUT = 'PUT',
  PATCH = 'PATCH',
  OPTIONS = 'OPTIONS',
  DELETE = 'DELETE',
}

export const restContext = {
  set,
  status,
  cookie,
  body,
  text,
  json,
  xml,
  delay,
  fetch,
}

const createRestHandler = (method: RESTMethods) => {
  return (
    mask: Mask,
    resolver: ResponseResolver<MockedRequest, typeof restContext>,
  ): RequestHandler<MockedRequest, typeof restContext> => {
    const resolvedMask = resolveMask(mask)
    const cleanMask =
      resolvedMask instanceof URL
        ? getCleanUrl(resolvedMask)
        : resolvedMask instanceof RegExp
        ? resolvedMask
        : resolveRelativeUrl(resolvedMask)

    return {
      predicate(req) {
        // Ignore query parameters and hash when matching requests URI
        const cleanUrl = getCleanUrl(req.url)
        const hasSameMethod = isStringEqual(method, req.method)
        const urlMatch = match(cleanMask, cleanUrl)

        return hasSameMethod && urlMatch.matches
      },

      getPublicRequest(req) {
        // Get request path parameters based on the given mask
        const params =
          (mask &&
            match(resolveRelativeUrl(mask), getCleanUrl(req.url)).params) ||
          {}

        return {
          ...req,
          params,
        }
      },
      resolver,

      defineContext() {
        return restContext
      },

      log(req, res, handler) {
        // Warn on request handler URL containing query parameters.
        if (resolvedMask instanceof URL && resolvedMask.search !== '') {
          const queryParams: string[] = []
          resolvedMask.searchParams.forEach((_, paramName) =>
            queryParams.push(paramName),
          )

          console.warn(
            `\
[MSW] Found a redundant usage of query parameters in the request handler URL for "${method} ${mask}". Please match against a path instead, and access query parameters in the response resolver function:

rest.${method.toLowerCase()}("${resolvedMask.pathname}", (req, res, ctx) => {
  const query = req.url.searchParams
${queryParams
  .map(
    (paramName) => `\
  const ${paramName} = query.get("${paramName}")`,
  )
  .join('\n')}
})\
`,
          )
        }

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
          `color:${getStatusCodeColor(res.status)}`,
          res.status,
          'color:inherit',
        )
        console.log('Request', loggedRequest)
        console.log('Handler:', {
          mask,
          resolver: handler.resolver,
        })
        console.log('Response', loggedResponse)
        console.groupEnd()
      },
    }
  }
}

export const rest = {
  get: createRestHandler(RESTMethods.GET),
  post: createRestHandler(RESTMethods.POST),
  put: createRestHandler(RESTMethods.PUT),
  delete: createRestHandler(RESTMethods.DELETE),
  patch: createRestHandler(RESTMethods.PATCH),
  options: createRestHandler(RESTMethods.OPTIONS),
}

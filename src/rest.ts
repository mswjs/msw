import {
  RequestHandler,
  ResponseResolver,
  MockedRequest,
  DefaultRequestBodyType,
} from './utils/handlers/requestHandler'
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
import { prepareRequest } from './utils/logging/prepareRequest'
import { prepareResponse } from './utils/logging/prepareResponse'
import { getPublicUrlFromRequest } from './utils/request/getPublicUrlFromRequest'
import { getTimestamp } from './utils/logging/getTimestamp'
import { getStatusCodeColor } from './utils/logging/getStatusCodeColor'
import { isStringEqual } from './utils/internal/isStringEqual'
import { matchRequestUrl } from './utils/matching/matchRequestUrl'
import { getUrlByMask } from './utils/url/getUrlByMask'
import { mergeMasks } from './utils/matching/mergeMasks'

export enum RESTMethods {
  HEAD = 'HEAD',
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

export interface ParsedRestRequest {
  match: ReturnType<typeof matchRequestUrl>
}

const createRestHandler = (method: RESTMethods, baseUrl: string) => {
  return <RequestBodyType = DefaultRequestBodyType, ResponseBodyType = any>(
    mask: Mask,
    resolver: ResponseResolver<
      MockedRequest<RequestBodyType>,
      typeof restContext,
      ResponseBodyType
    >,
  ): RequestHandler<
    MockedRequest<RequestBodyType>,
    typeof restContext,
    ParsedRestRequest,
    MockedRequest<RequestBodyType>,
    ResponseBodyType
  > => {
    const mergedMask = baseUrl ? mergeMasks(baseUrl, mask) : mask
    const resolvedMask = getUrlByMask(mergedMask)

    return {
      parse(req) {
        // Match the request during parsing to prevent matching it twice
        // in order to get the request URL parameters.
        const match = matchRequestUrl(req.url, mergedMask)

        return {
          match,
        }
      },

      predicate(req, parsedRequest) {
        return isStringEqual(method, req.method) && parsedRequest.match.matches
      },

      getPublicRequest(req, parsedRequest) {
        // Get request path parameters based on the given mask
        const params = (mergedMask && parsedRequest.match.params) || {}

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

        const publicUrl = getPublicUrlFromRequest(req)

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

function createRestStandardHandlers(uri: string) {
  return {
    head: createRestHandler(RESTMethods.HEAD, uri),
    get: createRestHandler(RESTMethods.GET, uri),
    post: createRestHandler(RESTMethods.POST, uri),
    put: createRestHandler(RESTMethods.PUT, uri),
    delete: createRestHandler(RESTMethods.DELETE, uri),
    patch: createRestHandler(RESTMethods.PATCH, uri),
    options: createRestHandler(RESTMethods.OPTIONS, uri),
  }
}

const restStandardHandlers = createRestStandardHandlers('')

export const rest = {
  ...restStandardHandlers,
  link: createRestStandardHandlers,
}

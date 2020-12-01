import {
  RequestHandler,
  ResponseResolver,
  MockedRequest,
  DefaultRequestBodyType,
  RequestParams,
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
import { getCallFrame } from './utils/internal/getCallFrame'

export enum RESTMethods {
  HEAD = 'HEAD',
  GET = 'GET',
  POST = 'POST',
  PUT = 'PUT',
  PATCH = 'PATCH',
  OPTIONS = 'OPTIONS',
  DELETE = 'DELETE',
}

// Declaring a context interface infers
// JSDoc description of the referenced utils.
export interface RestContext {
  set: typeof set
  status: typeof status
  cookie: typeof cookie
  text: typeof text
  body: typeof body
  json: typeof json
  xml: typeof xml
  delay: typeof delay
  fetch: typeof fetch
}

export const restContext: RestContext = {
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

const createRestHandler = (method: RESTMethods) => {
  return <
    RequestBodyType = DefaultRequestBodyType,
    ResponseBodyType = any,
    RequestParamsType extends RequestParams = RequestParams
  >(
    mask: Mask,
    resolver: ResponseResolver<
      MockedRequest<RequestBodyType, RequestParamsType>,
      typeof restContext,
      ResponseBodyType
    >,
  ): RequestHandler<
    MockedRequest<RequestBodyType, RequestParamsType>,
    typeof restContext,
    ParsedRestRequest,
    MockedRequest<RequestBodyType>,
    ResponseBodyType
  > => {
    const resolvedMask = getUrlByMask(mask)
    const callFrame = getCallFrame()

    return {
      parse(req) {
        // Match the request during parsing to prevent matching it twice
        // in order to get the request URL parameters.
        const match = matchRequestUrl(req.url, mask)

        return {
          match,
        }
      },
      predicate(req, parsedRequest) {
        return isStringEqual(method, req.method) && parsedRequest.match.matches
      },

      getPublicRequest(req, parsedRequest) {
        // Get request path parameters based on the given mask
        const params = (mask && parsedRequest.match.params) || {}

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

      getMetaInfo() {
        return {
          type: 'rest',
          header: `[rest] ${method} ${mask.toString()}`,
          mask,
          callFrame,
        }
      },
    }
  }
}

export const rest = {
  head: createRestHandler(RESTMethods.HEAD),
  get: createRestHandler(RESTMethods.GET),
  post: createRestHandler(RESTMethods.POST),
  put: createRestHandler(RESTMethods.PUT),
  delete: createRestHandler(RESTMethods.DELETE),
  patch: createRestHandler(RESTMethods.PATCH),
  options: createRestHandler(RESTMethods.OPTIONS),
}

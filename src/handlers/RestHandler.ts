import { Match, Path } from 'node-match-path'
import {
  body,
  cookie,
  delay,
  fetch,
  json,
  set,
  status,
  text,
  xml,
} from '../context'
import { SerializedResponse } from '../setupWorker/glossary'
import { ResponseResolutionContext } from '../utils/getResponse'
import { devUtils } from '../utils/internal/devUtils'
import { isStringEqual } from '../utils/internal/isStringEqual'
import { getStatusCodeColor } from '../utils/logging/getStatusCodeColor'
import { getTimestamp } from '../utils/logging/getTimestamp'
import { prepareRequest } from '../utils/logging/prepareRequest'
import { prepareResponse } from '../utils/logging/prepareResponse'
import { matchRequestUrl } from '../utils/matching/matchRequestUrl'
import { getPublicUrlFromRequest } from '../utils/request/getPublicUrlFromRequest'
import { getUrlByPath } from '../utils/url/getUrlByPath'
import {
  DefaultRequestBody,
  MockedRequest,
  RequestHandler,
  ResponseResolver,
} from './RequestHandler'

interface RestHandlerInfo {
  method: string
  path: Path
}

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
export type RestContext = {
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

export type RequestParams = {
  [paramName: string]: any
}

export type RequestQuery = {
  [queryName: string]: any
}

export interface RestRequest<
  BodyType extends DefaultRequestBody = DefaultRequestBody,
  ParamsType extends RequestParams = Record<string, any>,
> extends MockedRequest<BodyType> {
  params: ParamsType
}

export type ParsedRestRequest = Match

/**
 * Request handler for REST API requests.
 * Provides request matching based on method and URL.
 */
export class RestHandler<
  RequestType extends MockedRequest<DefaultRequestBody> = MockedRequest<DefaultRequestBody>,
> extends RequestHandler<
  RestHandlerInfo,
  RequestType,
  ParsedRestRequest,
  RestRequest<RequestParams>
> {
  constructor(
    method: string,
    path: Path,
    resolver: ResponseResolver<any, any>,
  ) {
    super({
      info: {
        header: `${method} ${path}`,
        path,
        method,
      },
      ctx: restContext,
      resolver,
    })

    this.checkRedundantQueryParameters()
  }

  private checkRedundantQueryParameters() {
    const { method, path } = this.info
    const resolvedPath = getUrlByPath(path)

    if (resolvedPath instanceof URL && resolvedPath.search !== '') {
      const queryParams: string[] = []
      resolvedPath.searchParams.forEach((_, paramName) => {
        queryParams.push(paramName)
      })

      devUtils.warn(`\
Found a redundant usage of query parameters in the request handler URL for "${method} ${path}". Please match against a path instead, and access query parameters in the response resolver function:

rest.${method.toLowerCase()}("${resolvedPath.pathname}", (req, res, ctx) => {
  const query = req.url.searchParams
${queryParams
  .map(
    (paramName) => `\
  const ${paramName} = query.get("${paramName}")`,
  )
  .join('\n')}
})\
      `)
    }
  }

  parse(request: RequestType, resolutionContext?: ResponseResolutionContext) {
    return matchRequestUrl(
      request.url,
      this.info.path,
      resolutionContext?.baseUrl,
    )
  }

  protected getPublicRequest(
    request: RequestType,
    parsedResult: ParsedRestRequest,
  ): RestRequest<any, RequestParams> {
    return {
      ...request,
      params: parsedResult.params || {},
    }
  }

  predicate(request: RequestType, parsedResult: ParsedRestRequest) {
    return (
      isStringEqual(this.info.method, request.method) && parsedResult.matches
    )
  }

  log(request: RequestType, response: SerializedResponse<any>) {
    const publicUrl = getPublicUrlFromRequest(request)
    const loggedRequest = prepareRequest(request)
    const loggedResponse = prepareResponse(response)

    console.groupCollapsed(
      devUtils.formatMessage('%s %s %s (%c%s%c)'),
      getTimestamp(),
      request.method,
      publicUrl,
      `color:${getStatusCodeColor(response.status)}`,
      response.status,
      'color:inherit',
    )
    console.log('Request', loggedRequest)
    console.log('Handler:', {
      mask: this.info.path,
      resolver: this.resolver,
    })
    console.log('Response', loggedResponse)
    console.groupEnd()
  }
}

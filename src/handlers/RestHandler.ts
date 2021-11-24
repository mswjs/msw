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
import {
  Match,
  matchRequestUrl,
  Path,
  PathParams,
} from '../utils/matching/matchRequestUrl'
import { getPublicUrlFromRequest } from '../utils/request/getPublicUrlFromRequest'
import { cleanUrl, getSearchParams } from '../utils/url/cleanUrl'
import {
  DefaultRequestBody,
  MockedRequest,
  RequestHandler,
  ResponseResolver,
} from './RequestHandler'

type RestHandlerMethod = string | RegExp

interface RestHandlerInfo {
  method: RestHandlerMethod
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

export type RequestQuery = {
  [queryName: string]: string
}

export interface RestRequest<
  BodyType extends DefaultRequestBody = DefaultRequestBody,
  ParamsType extends PathParams = PathParams,
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
  RestRequest<
    RequestType extends MockedRequest<infer RequestBodyType>
      ? RequestBodyType
      : any,
    PathParams
  >
> {
  constructor(
    method: RestHandlerMethod,
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

    if (path instanceof RegExp) {
      return
    }

    const url = cleanUrl(path)

    // Bypass request handler URLs that have no redundant characters.
    if (url === path) {
      return
    }

    const searchParams = getSearchParams(path)
    const queryParams: string[] = []

    searchParams.forEach((_, paramName) => {
      queryParams.push(paramName)
    })

    devUtils.warn(
      `Found a redundant usage of query parameters in the request handler URL for "${method} ${path}". Please match against a path instead and access query parameters in the response resolver function using "req.url.searchParams".`,
    )
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
  ): RestRequest<any, PathParams> {
    return {
      ...request,
      params: parsedResult.params || {},
    }
  }

  predicate(request: RequestType, parsedResult: ParsedRestRequest) {
    const matchesMethod =
      this.info.method instanceof RegExp
        ? this.info.method.test(request.method)
        : isStringEqual(this.info.method, request.method)

    // console.log({ request, matchesMethod, parsedResult })

    return matchesMethod && parsedResult.matches
  }

  log(request: RequestType, response: SerializedResponse) {
    const publicUrl = getPublicUrlFromRequest(request)
    const loggedRequest = prepareRequest(request)
    const loggedResponse = prepareResponse(response)
    const statusColor = getStatusCodeColor(response.status)

    console.groupCollapsed(
      devUtils.formatMessage('%s %s %s (%c%s%c)'),
      getTimestamp(),
      request.method,
      publicUrl,
      `color:${statusColor}`,
      `${response.status} ${response.statusText}`,
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

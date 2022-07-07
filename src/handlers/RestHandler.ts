import { body, cookie, json, text, xml } from '../context'
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
import { MockedRequest } from '../utils/request/MockedRequest'
import { cleanUrl, getSearchParams } from '../utils/url/cleanUrl'
import {
  DefaultBodyType,
  defaultContext,
  DefaultContext,
  RequestHandler,
  RequestHandlerDefaultInfo,
  ResponseResolver,
} from './RequestHandler'

type RestHandlerMethod = string | RegExp

export interface RestHandlerInfo extends RequestHandlerDefaultInfo {
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
export type RestContext = DefaultContext & {
  cookie: typeof cookie
  text: typeof text
  body: typeof body
  json: typeof json
  xml: typeof xml
}

export const restContext: RestContext = {
  ...defaultContext,
  cookie,
  body,
  text,
  json,
  xml,
}

export type RequestQuery = {
  [queryName: string]: string
}

export type ParsedRestRequest = Match

export class RestRequest<
  RequestBody extends DefaultBodyType = DefaultBodyType,
  RequestParams extends PathParams = PathParams,
> extends MockedRequest<RequestBody> {
  constructor(
    request: MockedRequest<RequestBody>,
    public readonly params: RequestParams,
  ) {
    super(request.url, {
      ...request,
      /**
       * @deprecated
       * @note Use internal request body buffer as the body init
       * because "request.body" is a getter that will trigger
       * request body parsing at this step.
       */
      body: request['_body'],
    })
    this.id = request.id
  }
}

/**
 * Request handler for REST API requests.
 * Provides request matching based on method and URL.
 */
export class RestHandler<
  RequestType extends MockedRequest<DefaultBodyType> = MockedRequest<DefaultBodyType>,
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
    return new RestRequest(request, parsedResult.params || {})
  }

  predicate(request: RequestType, parsedResult: ParsedRestRequest) {
    const matchesMethod =
      this.info.method instanceof RegExp
        ? this.info.method.test(request.method)
        : isStringEqual(this.info.method, request.method)

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

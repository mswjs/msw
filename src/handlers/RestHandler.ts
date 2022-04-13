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
  ExtractPathParams,
  DefaultParamsType,
} from '../utils/matching/matchRequestUrl'
import { getPublicUrlFromRequest } from '../utils/request/getPublicUrlFromRequest'
import { cleanUrl, getSearchParams } from '../utils/url/cleanUrl'
import {
  DefaultBodyType,
  defaultContext,
  DefaultContext,
  MockedRequest,
  RequestHandler,
  RequestHandlerDefaultInfo,
  ResponseResolver,
} from './RequestHandler'

export type RestMethodType = RESTMethods | RegExp

export interface RestHandlerInfo<ExactPath extends Path>
  extends RequestHandlerDefaultInfo {
  method: RestMethodType
  path: ExactPath
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

export interface RestRequest<
  BodyType extends DefaultBodyType = DefaultBodyType,
  ParamsType extends ExtractPathParams<Path> = ExtractPathParams<RegExp>,
> extends MockedRequest<BodyType> {
  params: ParamsType
}

export type ParsedRestRequest<P extends Path> = Match<P>

export type RestResponseResolver<
  MethodType extends RestMethodType,
  RequestBodyType extends DefaultBodyType,
  ParamsType extends DefaultParamsType,
  ResponseBodyType extends DefaultBodyType,
> = ResponseResolver<
  RestRequest<
    MethodType extends RESTMethods.HEAD | RESTMethods.GET
      ? never
      : RequestBodyType,
    ParamsType
  >,
  RestContext,
  ResponseBodyType
>

/**
 * Request handler for REST API requests.
 * Provides request matching based on method and URL.
 */
export class RestHandler<
  MethodType extends RESTMethods | RegExp = RESTMethods | RegExp,
  PathType extends Path = Path,
  RequestBodyType extends DefaultBodyType = DefaultBodyType,
  ResponseBodyType extends DefaultBodyType = DefaultBodyType,
> extends RequestHandler<
  RestHandlerInfo<PathType>,
  MockedRequest<RequestBodyType>,
  ParsedRestRequest<PathType>,
  RestRequest<RequestBodyType, ExtractPathParams<PathType>>
> {
  constructor(
    method: MethodType,
    path: PathType,
    resolver: RestResponseResolver<
      MethodType,
      RequestBodyType,
      ExtractPathParams<PathType>,
      ResponseBodyType
    >,
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

  parse(
    request: MockedRequest<RequestBodyType>,
    resolutionContext?: ResponseResolutionContext,
  ) {
    return matchRequestUrl(
      request.url,
      this.info.path,
      resolutionContext?.baseUrl,
    )
  }

  protected getPublicRequest(
    request: MockedRequest<RequestBodyType>,
    parsedResult: ParsedRestRequest<PathType>,
  ): RestRequest<any, ExtractPathParams<PathType>> {
    return {
      ...request,
      params: parsedResult.params,
    }
  }

  predicate(
    request: MockedRequest<RequestBodyType>,
    parsedResult: ParsedRestRequest<PathType>,
  ) {
    const matchesMethod =
      this.info.method instanceof RegExp
        ? this.info.method.test(request.method)
        : isStringEqual(this.info.method, request.method)

    return matchesMethod && parsedResult.matches
  }

  log(request: MockedRequest<RequestBodyType>, response: SerializedResponse) {
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

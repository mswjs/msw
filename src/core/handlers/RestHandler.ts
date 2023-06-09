import { ResponseResolutionContext } from '../utils/getResponse'
import { devUtils } from '../utils/internal/devUtils'
import { isStringEqual } from '../utils/internal/isStringEqual'
import { getStatusCodeColor } from '../utils/logging/getStatusCodeColor'
import { getTimestamp } from '../utils/logging/getTimestamp'
import { serializeRequest } from '../utils/logging/serializeRequest'
import { serializeResponse } from '../utils/logging/serializeResponse'
import {
  Match,
  matchRequestUrl,
  Path,
  PathParams,
} from '../utils/matching/matchRequestUrl'
import { getPublicUrlFromRequest } from '../utils/request/getPublicUrlFromRequest'
import { getAllRequestCookies } from '../utils/request/getRequestCookies'
import { cleanUrl, getSearchParams } from '../utils/url/cleanUrl'
import {
  RequestHandler,
  RequestHandlerDefaultInfo,
  RequestHandlerPublicOptions,
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

export type RequestQuery = {
  [queryName: string]: string
}

export type RestRequestParsedResult = {
  match: Match
  cookies: Record<string, string>
}

export type RestRequestResolverExtras<Params extends PathParams> = {
  params: Params
  cookies: Record<string, string | Array<string>>
}

/**
 * Request handler for REST API requests.
 * Provides request matching based on method and URL.
 */
export class RestHandler extends RequestHandler<
  RestHandlerInfo,
  RestRequestParsedResult,
  RestRequestResolverExtras<any>
> {
  constructor(
    method: RestHandlerMethod,
    path: Path,
    resolver: ResponseResolver<RestRequestResolverExtras<any>, any, any>,
    options?: RequestHandlerPublicOptions,
  ) {
    super({
      info: {
        header: `${method} ${path}`,
        path,
        method,
      },
      resolver,
      once: options?.once,
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

  async parse(request: Request, resolutionContext?: ResponseResolutionContext) {
    const url = new URL(request.url)
    const match = matchRequestUrl(
      url,
      this.info.path,
      resolutionContext?.baseUrl,
    )
    const cookies = getAllRequestCookies(request)

    return {
      match,
      cookies,
    }
  }

  predicate(request: Request, parsedResult: RestRequestParsedResult) {
    const hasMatchingMethod = this.matchMethod(request.method)
    const hasMatchingUrl = parsedResult.match.matches
    return hasMatchingMethod && hasMatchingUrl
  }

  private matchMethod(actualMethod: string): boolean {
    return this.info.method instanceof RegExp
      ? this.info.method.test(actualMethod)
      : isStringEqual(this.info.method, actualMethod)
  }

  protected extendInfo(
    _request: Request,
    parsedResult: RestRequestParsedResult,
  ) {
    return {
      params: parsedResult.match?.params || {},
      cookies: parsedResult.cookies,
    }
  }

  async log(request: Request, response: Response) {
    const publicUrl = getPublicUrlFromRequest(request)
    const loggedRequest = await serializeRequest(request)
    const loggedResponse = await serializeResponse(response)
    const statusColor = getStatusCodeColor(loggedResponse.status)

    console.groupCollapsed(
      devUtils.formatMessage('%s %s %s (%c%s%c)'),
      getTimestamp(),
      request.method,
      publicUrl,
      `color:${statusColor}`,
      `${loggedResponse.status} ${loggedResponse.statusText}`,
      'color:inherit',
    )
    console.log('Request', loggedRequest)
    console.log('Handler:', this)
    console.log('Response', loggedResponse)
    console.groupEnd()
  }
}

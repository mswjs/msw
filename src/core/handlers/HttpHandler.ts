import { ResponseResolutionContext } from '../utils/executeHandlers'
import { devUtils } from '../utils/internal/devUtils'
import { isStringEqual } from '../utils/internal/isStringEqual'
import { getStatusCodeColor } from '../utils/logging/getStatusCodeColor'
import { getTimestamp } from '../utils/logging/getTimestamp'
import { serializeRequest } from '../utils/logging/serializeRequest'
import { serializeResponse } from '../utils/logging/serializeResponse'
import {
  matchRequestUrl,
  Match,
  Path,
  PathParams,
} from '../utils/matching/matchRequestUrl'
import { toPublicUrl } from '../utils/request/toPublicUrl'
import { getAllRequestCookies } from '../utils/request/getRequestCookies'
import { cleanUrl, getSearchParams } from '../utils/url/cleanUrl'
import {
  RequestHandler,
  RequestHandlerDefaultInfo,
  RequestHandlerOptions,
  ResponseResolver,
} from './RequestHandler'

type HttpHandlerMethod = string | RegExp

export interface HttpHandlerInfo extends RequestHandlerDefaultInfo {
  method: HttpHandlerMethod
  path: Path
}

export enum HttpMethods {
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

export type HttpRequestParsedResult = {
  match: Match
  cookies: Record<string, string>
}

export type HttpRequestResolverExtras<Params extends PathParams> = {
  params: Params
  cookies: Record<string, string>
}

/**
 * Request handler for HTTP requests.
 * Provides request matching based on method and URL.
 */
export class HttpHandler extends RequestHandler<
  HttpHandlerInfo,
  HttpRequestParsedResult,
  HttpRequestResolverExtras<any>
> {
  constructor(
    method: HttpHandlerMethod,
    path: Path,
    resolver: ResponseResolver<HttpRequestResolverExtras<any>, any, any>,
    options?: RequestHandlerOptions,
  ) {
    super({
      info: {
        header: `${method} ${path}`,
        path,
        method,
      },
      resolver,
      options,
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
      `Found a redundant usage of query parameters in the request handler URL for "${method} ${path}". Please match against a path instead and access query parameters using "new URL(request.url).searchParams" instead. Learn more: https://mswjs.io/docs/http/intercepting-requestsquery-parameters`,
    )
  }

  async parse(args: {
    request: Request
    resolutionContext?: ResponseResolutionContext
  }) {
    const url = new URL(args.request.url)
    const match = matchRequestUrl(
      url,
      this.info.path,
      args.resolutionContext?.baseUrl,
    )
    const cookies = getAllRequestCookies(args.request)

    return {
      match,
      cookies,
    }
  }

  predicate(args: { request: Request; parsedResult: HttpRequestParsedResult }) {
    const hasMatchingMethod = this.matchMethod(args.request.method)
    const hasMatchingUrl = args.parsedResult.match.matches
    return hasMatchingMethod && hasMatchingUrl
  }

  private matchMethod(actualMethod: string): boolean {
    return this.info.method instanceof RegExp
      ? this.info.method.test(actualMethod)
      : isStringEqual(this.info.method, actualMethod)
  }

  protected extendResolverArgs(args: {
    request: Request
    parsedResult: HttpRequestParsedResult
  }) {
    return {
      params: args.parsedResult.match?.params || {},
      cookies: args.parsedResult.cookies,
    }
  }

  async log(args: { request: Request; response: Response }) {
    const publicUrl = toPublicUrl(args.request.url)
    const loggedRequest = await serializeRequest(args.request)
    const loggedResponse = await serializeResponse(args.response)
    const statusColor = getStatusCodeColor(loggedResponse.status)

    // eslint-disable-next-line no-console
    console.groupCollapsed(
      devUtils.formatMessage(
        `${getTimestamp()} ${args.request.method} ${publicUrl} (%c${
          loggedResponse.status
        } ${loggedResponse.statusText}%c)`,
      ),
      `color:${statusColor}`,
      'color:inherit',
    )
    // eslint-disable-next-line no-console
    console.log('Request', loggedRequest)
    // eslint-disable-next-line no-console
    console.log('Handler:', this)
    // eslint-disable-next-line no-console
    console.log('Response', loggedResponse)
    // eslint-disable-next-line no-console
    console.groupEnd()
  }
}

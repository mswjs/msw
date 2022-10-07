import { body, cookie, json, text, xml } from '../context'
import type { SerializedResponse } from '../setupWorker/glossary'
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

export type RestRequestParsedResult = {
  match: Match
  cookies: Record<string, string | Array<string>>
}

export type RestRequestResolverExtras<Params extends PathParams> = {
  params: Params
  cookies: Record<string, string | Array<string>>
}

// export class RestRequest<
//   RequestBody extends DefaultBodyType = DefaultBodyType,
//   RequestParams extends PathParams = PathParams,
// > extends Request {
//   constructor(
//     request: MockedRequest<RequestBody>,
//     public readonly params: RequestParams,
//   ) {
//     super(request.url, {
//       ...request,
//       /**
//        * @deprecated https://github.com/mswjs/msw/issues/1318
//        * @note Use internal request body buffer as the body init
//        * because "request.body" is a getter that will trigger
//        * request body parsing at this step.
//        */
//       body: request['_body'],
//     })
//     this.id = request.id
//   }
// }

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
    resolver: ResponseResolver<any, RestRequestResolverExtras<any>>,
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

  override async parse(
    request: Request,
    resolutionContext?: ResponseResolutionContext,
  ) {
    const match = matchRequestUrl(
      new URL(request.url),
      this.info.path,
      resolutionContext?.baseUrl,
    )

    return {
      match,
      cookies: {},
    }
  }

  override predicate(request: Request, parsedResult: RestRequestParsedResult) {
    const hasMatchingMethod = this.matchMethod(request.method)
    const hasMatchingUrl = parsedResult.match.matches
    return hasMatchingMethod && hasMatchingUrl
  }

  private matchMethod(actualMethod: string): boolean {
    return this.info.method instanceof RegExp
      ? this.info.method.test(actualMethod)
      : isStringEqual(this.info.method, actualMethod)
  }

  protected override extendInfo(
    request: Request,
    parsedResult: RestRequestParsedResult,
  ) {
    return {
      params: parsedResult.match?.params || {},
      cookies: {},
    }
  }

  override log(request: Request, response: SerializedResponse<any>) {
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
    console.log('Handler:', this)
    console.log('Response', loggedResponse)
    console.groupEnd()
  }
}

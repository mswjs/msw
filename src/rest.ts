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
import { resolveRelativeUrl } from './utils/resolveRelativeUrl'

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

const createRESTHandler = (method: RESTMethods) => {
  return (
    mask: Mask,
    resolver: ResponseResolver<MockedRequest, typeof restContext>,
  ): RequestHandler<MockedRequest, typeof restContext> => {
    return {
      mask,
      predicate(req) {
        // Ignore query parameters and hash when matching requests URI
        const rawUrl = getCleanUrl(req.url)
        const hasSameMethod = method.toUpperCase() === req.method.toUpperCase()
        const urlMatch = match(resolveRelativeUrl(mask), rawUrl)

        return hasSameMethod && urlMatch.matches
      },
      defineContext() {
        return restContext
      },
      resolver,
    }
  }
}

const rest = {
  get: createRESTHandler(RESTMethods.GET),
  post: createRESTHandler(RESTMethods.POST),
  put: createRESTHandler(RESTMethods.PUT),
  delete: createRESTHandler(RESTMethods.DELETE),
  patch: createRESTHandler(RESTMethods.PATCH),
  options: createRESTHandler(RESTMethods.OPTIONS),
}

export { rest }

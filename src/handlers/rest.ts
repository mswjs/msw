import { match } from 'node-match-path'
import { RequestHandler, ResponseResolver } from './requestHandler'
import { Mask } from '../composeMocks'
import { set } from '../context/set'
import { status } from '../context/status'
import { body } from '../context/body'
import { text } from '../context/text'
import { json } from '../context/json'
import { xml } from '../context/xml'
import { delay } from '../context/delay'
import { fetch } from '../context/fetch'
import { resolveRequestMask } from '../utils/resolveRequestMask'

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
    resolver: ResponseResolver<typeof restContext>,
  ): RequestHandler<typeof restContext> => {
    return {
      mask,
      predicate(req) {
        const hasSameMethod = method === req.method

        // Prepends a host origin to the routes that start
        // with the slash ("/"). This way such routes will match
        // the respective hostname's routes, while bypassing
        // the routes from different hosts.
        const urlMatch = match(resolveRequestMask(mask), req.url)

        return hasSameMethod && urlMatch.matches
      },
      defineContext() {
        return restContext
      },
      resolver,
    }
  }
}

export default {
  get: createRESTHandler(RESTMethods.GET),
  post: createRESTHandler(RESTMethods.POST),
  put: createRESTHandler(RESTMethods.PUT),
  delete: createRESTHandler(RESTMethods.DELETE),
  patch: createRESTHandler(RESTMethods.PATCH),
  options: createRESTHandler(RESTMethods.OPTIONS),
}

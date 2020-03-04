import { match } from 'node-match-path'
import { RESTMethods, RequestHandler, ResponseResolver } from './requestHandler'
import { Mask } from '../composeMocks'

const createRESTHandler = (method: RESTMethods) => {
  return (mask: Mask, resolver: ResponseResolver): RequestHandler => {
    return {
      mask,
      predicate(req) {
        const hasSameMethod = method === req.method

        // Prepends a host origin to the routes that start
        // with the slash ("/"). This way such routes will match
        // the respective hostname's routes, while bypassing
        // the routes from different hosts.
        const resolvedMask =
          typeof mask === 'string' && mask.startsWith('/')
            ? `${location.origin}${mask}`
            : mask

        const urlMatch = match(resolvedMask, req.url)

        return hasSameMethod && urlMatch.matches
      },
      resolver,
    }
  }
}

const restMethods = {
  get: createRESTHandler(RESTMethods.GET),
  post: createRESTHandler(RESTMethods.POST),
  put: createRESTHandler(RESTMethods.PUT),
  delete: createRESTHandler(RESTMethods.DELETE),
  patch: createRESTHandler(RESTMethods.PATCH),
  options: createRESTHandler(RESTMethods.OPTIONS),
}

export default restMethods

import { RESTMethods, RequestHandler, ResponseResolver } from './requestHandler'
import { Mask } from '../composeMocks'
import matchPath from '../utils/matchPath'

const createRESTHandler = (method: RESTMethods) => {
  return (mask: Mask, resolver: ResponseResolver): RequestHandler => {
    return {
      mask,
      predicate(req) {
        return (
          method === req.method && matchPath(req.url, { path: mask }).matches
        )
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

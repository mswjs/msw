import createHandler, { RESTMethods } from './createHandler'

export default {
  get: createHandler(RESTMethods.GET),
  post: createHandler(RESTMethods.POST),
  put: createHandler(RESTMethods.PUT),
  delete: createHandler(RESTMethods.DELETE),
  patch: createHandler(RESTMethods.PATCH),
  options: createHandler(RESTMethods.OPTIONS),
}

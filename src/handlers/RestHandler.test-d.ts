import { RestHandler, RESTMethods } from './RestHandler'

/**
 * Path parameter inference.
 */
new RestHandler(RESTMethods.GET, '/user/:id', (req) => {
  req.params.id.trim()
})

new RestHandler(RESTMethods.POST, '/user/:id', (req) => {
  // @ts-expect-error Property "foo" doesn't exist in path params.
  req.params.foo
})

new RestHandler(RESTMethods.PUT, '/:service/user/:id/message/:id', (req) => {
  req.params.service.trim()
  req.params.id.map
})

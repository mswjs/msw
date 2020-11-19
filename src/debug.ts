import { RequestHandler } from './utils/handlers/requestHandler'
import { getPublicUrlFromRequest } from './utils/request/getPublicUrlFromRequest'

/**
 * Creates a permissive request handler for debugging purposes.
 */
export const debug: RequestHandler = {
  predicate(req) {
    const publicUrl = getPublicUrlFromRequest(req)

    console.groupCollapsed(`[MSW] DEBUG ${req.method} ${publicUrl}`)
    console.log('Request:', req)
    console.groupEnd()

    return true
  },
  resolver(req) {
    const publicUrl = getPublicUrlFromRequest(req)

    console.warn(`\
[MSW] No mocks found for ${req.method} ${publicUrl}

Create a request handler to capture this request:

rest.${req.method.toLowerCase()}('${publicUrl}', (req, res, ctx) => {
  return res(ctx.body('test'))
})\
`)
    return
  },
  log() {
    return
  },
  getMetaInfo() {
    return {} as any
  },
}

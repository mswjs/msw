import { MockedRequest, RequestHandler } from './handlers/requestHandler'
import { ResponseWithSerializedHeaders } from './setupWorker/glossary'
import { getPublicUrlFromRequest } from './utils/request/getPublicUrlFromRequest'

/**
 * Creates a permissive request handler for debugging purposes.
 */
class DebugHandler extends RequestHandler {
  constructor() {
    super({
      info: {
        header: '[debug]',
      },
      resolver: () => {},
    })
  }

  predicate() {
    return true
  }

  log(request: MockedRequest, response: ResponseWithSerializedHeaders) {
    const publicUrl = getPublicUrlFromRequest(request)

    console.warn(`
[MSW] No mocks found for ${request.method} ${publicUrl}!
    `)
  }
}

export const debug = new DebugHandler()

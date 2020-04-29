import { RequestInterceptor } from 'node-request-interceptor'
import { RequestHandler, MockedRequest } from '../handlers/requestHandler'
import { getResponse } from '../utils/getResponse'
import { headersToObject } from '../utils/headersToObject'

export const setupServer = (...handlers: RequestHandler<any, any>[]) => {
  let interceptor: RequestInterceptor

  return {
    open() {
      interceptor = new RequestInterceptor()
      interceptor.use(async (req) => {
        const mockedRequest: MockedRequest = {
          url: req.url,
          method: req.method,
          redirect: 'manual',
          referrer: '',
          keepalive: false,
          cache: 'default',
          headers: new Headers(),
          mode: 'cors',
          referrerPolicy: 'no-referrer',
          integrity: '',
          destination: 'document',
          body: '',
          bodyUsed: false,
          credentials: 'same-origin',
          params: {},
          query: new URLSearchParams(),
        }

        const { response } = await getResponse(mockedRequest as any, handlers)

        if (response) {
          return {
            status: response.status,
            body: response.body,
            headers: headersToObject(response.headers),
          }
        }
      })
    },
    close() {
      interceptor.restore()
    },
  }
}

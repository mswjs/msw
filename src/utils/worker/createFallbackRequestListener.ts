import {
  MockedResponse,
  createInterceptor,
  InterceptorApi,
} from '@mswjs/interceptors'
import { interceptFetch } from '@mswjs/interceptors/lib/interceptors/fetch'
import { interceptXMLHttpRequest } from '@mswjs/interceptors/lib/interceptors/XMLHttpRequest'
import { RequestHandler } from '../../handlers/RequestHandler'
import {
  SetupWorkerInternalContext,
  StartOptions,
} from '../../setupWorker/glossary'
import { handleRequest } from '../handleRequest'
import { parseIsomorphicRequest } from '../request/parseIsomorphicRequest'

export function createFallbackRequestListener(
  context: SetupWorkerInternalContext,
  options: StartOptions,
): InterceptorApi {
  const interceptor = createInterceptor({
    modules: [interceptFetch, interceptXMLHttpRequest],
    async resolver(request) {
      const mockedRequest = parseIsomorphicRequest(request)
      return handleRequest<MockedResponse>(
        mockedRequest,
        context.requestHandlers,
        options,
        context.emitter,
        {
          transformResponse(response) {
            return {
              status: response.status,
              statusText: response.statusText,
              headers: response.headers.all(),
              body: response.body,
            }
          },
          onMockedResponseSent(
            response,
            { handler, publicRequest, parsedRequest },
          ) {
            if (!options.quiet) {
              handler.log(
                publicRequest,
                response,
                handler as RequestHandler,
                parsedRequest,
              )
            }
          },
        },
      )
    },
  })

  interceptor.apply()

  return interceptor
}

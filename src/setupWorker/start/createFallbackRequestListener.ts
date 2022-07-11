import {
  Interceptor,
  BatchInterceptor,
  HttpRequestEventMap,
} from '@mswjs/interceptors'
import { FetchInterceptor } from '@mswjs/interceptors/lib/interceptors/fetch'
import { XMLHttpRequestInterceptor } from '@mswjs/interceptors/lib/interceptors/XMLHttpRequest'
import type { RequestHandler } from '../../handlers/RequestHandler'
import {
  SerializedResponse,
  SetupWorkerInternalContext,
  StartOptions,
} from '../glossary'
import type { RequiredDeep } from '../../typeUtils'
import { handleRequest } from '../../utils/handleRequest'
import { MockedRequest } from '../../utils/request/MockedRequest'

export function createFallbackRequestListener(
  context: SetupWorkerInternalContext,
  options: RequiredDeep<StartOptions>,
): Interceptor<HttpRequestEventMap> {
  const interceptor = new BatchInterceptor({
    name: 'fallback',
    interceptors: [new FetchInterceptor(), new XMLHttpRequestInterceptor()],
  })

  interceptor.on('request', async (request) => {
    const mockedRequest = new MockedRequest(request)

    const response = await handleRequest<SerializedResponse>(
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
            delay: response.delay,
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

    if (response) {
      request.respondWith(response)
    }
  })

  interceptor.apply()

  return interceptor
}

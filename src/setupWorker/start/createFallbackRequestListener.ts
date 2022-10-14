import {
  Interceptor,
  BatchInterceptor,
  HttpRequestEventMap,
} from '@mswjs/interceptors'
import { FetchInterceptor } from '@mswjs/interceptors/lib/interceptors/fetch'
import { XMLHttpRequestInterceptor } from '@mswjs/interceptors/lib/interceptors/XMLHttpRequest'
import { SetupWorkerInternalContext, StartOptions } from '../glossary'
import type { RequiredDeep } from '../../typeUtils'
import { handleRequest } from '../../utils/handleRequest'
import { serializeResponse } from '../../utils/logging/serializeResponse'
import { createResponseFromIsomorphicResponse } from '../../utils/request/createResponseFromIsomorphicResponse'

export function createFallbackRequestListener(
  context: SetupWorkerInternalContext,
  options: RequiredDeep<StartOptions>,
): Interceptor<HttpRequestEventMap> {
  const interceptor = new BatchInterceptor({
    name: 'fallback',
    interceptors: [new FetchInterceptor(), new XMLHttpRequestInterceptor()],
  })

  interceptor.on('request', async (request) => {
    const response = await handleRequest(
      request,
      context.requestHandlers,
      options,
      context.emitter,
      {
        onMockedResponse(_, { handler, request, parsedRequest }) {
          if (!options.quiet) {
            context.emitter.once('response:mocked', (response) => {
              handler.log(request, serializeResponse(response), parsedRequest)
            })
          }
        },
      },
    )

    if (response) {
      request.respondWith(response)
    }
  })

  interceptor.on('response', (response, request, requestId) => {
    const browserResponse = createResponseFromIsomorphicResponse(response)

    if (response.headers.get('x-powered-by') === 'msw') {
      context.emitter.emit('response:mocked', browserResponse, requestId)
    } else {
      context.emitter.emit('response:bypass', browserResponse, requestId)
    }
  })

  interceptor.apply()

  return interceptor
}

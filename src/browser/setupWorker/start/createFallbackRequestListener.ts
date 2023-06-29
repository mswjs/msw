import {
  Interceptor,
  BatchInterceptor,
  HttpRequestEventMap,
} from '@mswjs/interceptors'
import { FetchInterceptor } from '@mswjs/interceptors/fetch'
import { XMLHttpRequestInterceptor } from '@mswjs/interceptors/XMLHttpRequest'
import { SetupWorkerInternalContext, StartOptions } from '../glossary'
import type { RequiredDeep } from '~/core/typeUtils'
import { handleRequest } from '~/core/utils/handleRequest'

export function createFallbackRequestListener(
  context: SetupWorkerInternalContext,
  options: RequiredDeep<StartOptions>,
): Interceptor<HttpRequestEventMap> {
  const interceptor = new BatchInterceptor({
    name: 'fallback',
    interceptors: [new FetchInterceptor(), new XMLHttpRequestInterceptor()],
  })

  interceptor.on('request', async (request, requestId) => {
    const requestCloneForLogs = request.clone()

    const response = await handleRequest(
      request,
      requestId,
      context.requestHandlers,
      options,
      context.emitter,
      {
        onMockedResponse(_, { handler, parsedRequest }) {
          if (!options.quiet) {
            context.emitter.once('response:mocked', (response) => {
              handler.log(requestCloneForLogs, response, parsedRequest)
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
    /**
     * @todo @fixme Don't rely on this response header since it's not set anymore.
     * Instead, extend the Interceptors to deliver the "isMockedResponse" flag in the args.
     */
    if (response.headers.get('x-powered-by') === 'msw') {
      context.emitter.emit('response:mocked', response, request, requestId)
    } else {
      context.emitter.emit('response:bypass', response, request, requestId)
    }
  })

  interceptor.apply()

  return interceptor
}

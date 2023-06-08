import {
  Interceptor,
  BatchInterceptor,
  HttpRequestEventMap,
} from '@mswjs/interceptors'
import { FetchInterceptor } from '@mswjs/interceptors/lib/interceptors/fetch'
import { XMLHttpRequestInterceptor } from '@mswjs/interceptors/lib/interceptors/XMLHttpRequest'
import {
  SerializedResponse,
  SetupWorkerInternalContext,
  StartOptions,
} from '../glossary'
import type { RequiredDeep } from '../../typeUtils'
import { handleRequest } from '../../utils/handleRequest'
import { MockedRequest } from '../../utils/request/MockedRequest'
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
    const mockedRequest = new MockedRequest(request.url, {
      ...request,
      body: await request.arrayBuffer(),
    })

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
        onMockedResponse(_, { handler, publicRequest, parsedRequest }) {
          if (!options.quiet) {
            context.emitter.once('response:mocked', async (response) => {
              handler.log(
                publicRequest,
                await serializeResponse(response),
                parsedRequest,
              )
            })
          }
        },
      },
    )

    if (response) {
      request.respondWith(response)
    }
  })

  interceptor.on('response', (request, response) => {
    if (!request.id) {
      return
    }

    const browserResponse = createResponseFromIsomorphicResponse(response)

    if (response.headers.get('x-powered-by') === 'msw') {
      context.emitter.emit('response:mocked', browserResponse, request.id)
    } else {
      context.emitter.emit('response:bypass', browserResponse, request.id)
    }
  })

  interceptor.apply()

  return interceptor
}

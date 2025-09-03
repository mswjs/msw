import { FetchResponse } from '@mswjs/interceptors'
import type {
  ServiceWorkerIncomingEventsMap,
  SetupWorkerInternalContext,
} from '../glossary'
import type { ServiceWorkerMessage } from './utils/createMessageChannel'
import { deserializeRequest } from '../../utils/deserializeRequest'

export function createResponseListener(context: SetupWorkerInternalContext) {
  return (
    _: MessageEvent,
    message: ServiceWorkerMessage<
      'RESPONSE',
      ServiceWorkerIncomingEventsMap['RESPONSE']
    >,
  ) => {
    const { payload: responseJson } = message
    const request = deserializeRequest(responseJson.request)

    /**
     * CORS requests with `mode: "no-cors"` result in "opaque" responses.
     * That kind of responses cannot be manipulated in JavaScript due
     * to the security considerations.
     * @see https://fetch.spec.whatwg.org/#concept-filtered-response-opaque
     * @see https://github.com/mswjs/msw/issues/529
     */
    if (responseJson.response.type?.includes('opaque')) {
      return
    }

    const response =
      responseJson.response.status === 0
        ? Response.error()
        : new FetchResponse(
            /**
             * Responses may be streams here, but when we create a response object
             * with null-body status codes, like 204, 205, 304 Response will
             * throw when passed a non-null body, so ensure it's null here
             * for those codes
             */
            FetchResponse.isResponseWithBody(responseJson.response.status)
              ? responseJson.response.body
              : null,
            {
              ...responseJson,
              /**
               * Set response URL if it's not set already.
               * @see https://github.com/mswjs/msw/issues/2030
               * @see https://developer.mozilla.org/en-US/docs/Web/API/Response/url
               */
              url: request.url,
            },
          )

    context.emitter.emit(
      responseJson.isMockedResponse ? 'response:mocked' : 'response:bypass',
      {
        requestId: responseJson.request.id,
        request,
        response,
      },
    )
  }
}

import type {
  ServiceWorkerIncomingEventsMap,
  SetupWorkerInternalContext,
} from '../glossary'
import type { ServiceWorkerMessage } from './utils/createMessageChannel'
import { isResponseWithoutBody } from '@mswjs/interceptors'

export function createResponseListener(context: SetupWorkerInternalContext) {
  return (
    _: MessageEvent,
    message: ServiceWorkerMessage<
      'RESPONSE',
      ServiceWorkerIncomingEventsMap['RESPONSE']
    >,
  ) => {
    const { payload: responseJson } = message

    // Get the Request instance reference stored in the
    // request listener.
    const { requestId } = responseJson
    const request = context.requests.get(requestId)!
    context.requests.delete(requestId)

    /**
     * CORS requests with `mode: "no-cors"` result in "opaque" responses.
     * That kind of responses cannot be manipulated in JavaScript due
     * to the security considerations.
     * @see https://fetch.spec.whatwg.org/#concept-filtered-response-opaque
     * @see https://github.com/mswjs/msw/issues/529
     */
    if (responseJson.type?.includes('opaque')) {
      return
    }

    const response =
      responseJson.status === 0
        ? Response.error()
        : new Response(
            /**
             * Responses may be streams here, but when we create a response object
             * with null-body status codes, like 204, 205, 304 Response will
             * throw when passed a non-null body, so ensure it's null here
             * for those codes
             */
            isResponseWithoutBody(responseJson.status)
              ? null
              : responseJson.body,
            responseJson,
          )

    /**
     * Set response URL if it's not set already.
     * @see https://github.com/mswjs/msw/issues/2030
     * @see https://developer.mozilla.org/en-US/docs/Web/API/Response/url
     */
    if (!response.url) {
      Object.defineProperty(response, 'url', {
        value: request.url,
        enumerable: true,
        writable: false,
      })
    }

    context.emitter.emit(
      responseJson.isMockedResponse ? 'response:mocked' : 'response:bypass',
      {
        response,
        request,
        requestId: responseJson.requestId,
      },
    )
  }
}

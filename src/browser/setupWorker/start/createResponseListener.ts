import {
  ServiceWorkerIncomingEventsMap,
  SetupWorkerInternalContext,
} from '../glossary'
import { ServiceWorkerMessage } from './utils/createMessageChannel'
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

    let response: Response
    if (responseJson.status === 0) {
      response = Response.error()
    } else if (isResponseWithoutBody(responseJson.status)) {
      response = new Response(null, responseJson)
    } else {
      response = new Response(responseJson.body, responseJson)
    }

    context.emitter.emit(
      responseJson.isMockedResponse ? 'response:mocked' : 'response:bypass',
      {
        response,
        /**
         * @todo @fixme In this context, we don't know anything about
         * the request.
         */
        request: null as any,
        requestId: responseJson.requestId,
      },
    )
  }
}

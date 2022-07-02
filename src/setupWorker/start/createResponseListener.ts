import {
  ServiceWorkerIncomingEventsMap,
  SetupWorkerInternalContext,
} from '../../setupWorker/glossary'
import { ServiceWorkerMessage } from './utils/createMessageChannel'

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

    const response = new Response(responseJson.body || null, responseJson)
    const isMockedResponse = response.headers.get('x-powered-by') === 'msw'

    if (isMockedResponse) {
      context.emitter.emit('response:mocked', response, responseJson.requestId)
    } else {
      context.emitter.emit('response:bypass', response, responseJson.requestId)
    }
  }
}

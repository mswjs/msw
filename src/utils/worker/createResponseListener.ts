import {
  ServiceWorkerIncomingEventsMap,
  SetupWorkerInternalContext,
} from '../../setupWorker/glossary'
import { ServiceWorkerMessage } from '../createBroadcastChannel'

export function createResponseListener(context: SetupWorkerInternalContext) {
  return (
    _: MessageEvent,
    message: ServiceWorkerMessage<
      'RESPONSE',
      ServiceWorkerIncomingEventsMap['RESPONSE']
    >,
  ) => {
    const { payload } = message
    const response = new Response(payload.body, payload)
    const isMockedResponse = response.headers.get('x-powered-by') === 'msw'

    if (isMockedResponse) {
      context.emitter.emit('response:mocked', response, payload.requestId)
    } else {
      context.emitter.emit('response:bypass', response, payload.requestId)
    }
  }
}

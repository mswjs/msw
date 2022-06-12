import { invariant } from 'outvariant'
import { StrictBroadcastChannel } from '../../../utils/internal/StrictBroadcastChannel'
import {
  SerializedResponse,
  ServiceWorkerBroadcastChannelMessageMap,
} from '../../glossary'
import { WorkerMessageChannel } from './createMessageChannel'

export async function streamResponse(
  operationChannel: StrictBroadcastChannel<ServiceWorkerBroadcastChannelMessageMap>,
  messageChannel: WorkerMessageChannel,
  mockedResponse: SerializedResponse,
): Promise<void> {
  const response = new Response(mockedResponse.body, mockedResponse)

  // Signal the mock response stream start event on the global
  // message channel because the worker expects an event in response
  // to the sent "REQUEST" global event.
  messageChannel.send({
    type: 'MOCK_RESPONSE_START',
    payload: mockedResponse,
  })

  invariant(response.body, 'Failed to stream mocked response with no body')

  // Read the mocked response body as stream
  // and pipe it to the worker.
  const reader = response.body.getReader()

  while (true) {
    const { done, value } = await reader.read()

    if (!done) {
      operationChannel.postMessage({
        type: 'MOCK_RESPONSE_CHUNK',
        payload: value,
      })
      continue
    }

    operationChannel.postMessage({
      type: 'MOCK_RESPONSE_END',
    })
    operationChannel.close()
    reader.releaseLock()
    break
  }
}

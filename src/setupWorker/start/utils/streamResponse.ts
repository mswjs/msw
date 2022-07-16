import { SerializedResponse } from '../../glossary'
import { WorkerMessageChannel } from './createMessageChannel'

export async function streamResponse(
  messageChannel: WorkerMessageChannel,
  mockedResponse: SerializedResponse,
): Promise<void> {
  const response = new Response(mockedResponse.body, mockedResponse)

  /**
   * Delete the ReadableStream response body
   * so it doesn't get sent via the message channel.
   * @note Otherwise, an error: cannot clone a ReadableStream if
   * it hasn't been transformed yet.
   */
  mockedResponse.body = await response.arrayBuffer()

  // Signal the mock response stream start event on the global
  // message channel because the worker expects an event in response
  // to the sent "REQUEST" global event.
  messageChannel.send(
    {
      type: 'MOCK_RESPONSE',
      payload: mockedResponse,
    },
    [mockedResponse.body],
  )
}

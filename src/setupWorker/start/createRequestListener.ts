import {
  StartOptions,
  SerializedResponse,
  SetupWorkerInternalContext,
  ServiceWorkerIncomingEventsMap,
  ServiceWorkerBroadcastChannelMessageMap,
} from '../glossary'
import {
  ServiceWorkerMessage,
  createMessageChannel,
} from './utils/createMessageChannel'
import { NetworkError } from '../../utils/NetworkError'
import { parseWorkerRequest } from '../../utils/request/parseWorkerRequest'
import { handleRequest } from '../../utils/handleRequest'
import { RequestHandler } from '../../handlers/RequestHandler'
import { RequiredDeep } from '../../typeUtils'
import { MockedResponse } from '../../response'
import { streamResponse } from './utils/streamResponse'
import { StrictBroadcastChannel } from '../../utils/internal/StrictBroadcastChannel'

export const createRequestListener = (
  context: SetupWorkerInternalContext,
  options: RequiredDeep<StartOptions>,
) => {
  return async (
    event: MessageEvent,
    message: ServiceWorkerMessage<
      'REQUEST',
      ServiceWorkerIncomingEventsMap['REQUEST']
    >,
  ) => {
    const messageChannel = createMessageChannel(event)

    try {
      const request = parseWorkerRequest(message.payload)
      const operationChannel =
        new StrictBroadcastChannel<ServiceWorkerBroadcastChannelMessageMap>(
          `msw-response-stream-${request.id}`,
        )

      await handleRequest<SerializedResponse>(
        request,
        context.requestHandlers,
        options,
        context.emitter,
        {
          transformResponse,
          onPassthroughResponse() {
            return messageChannel.send({
              type: 'MOCK_NOT_FOUND',
            })
          },
          onMockedResponse(response) {
            // Signal the mocked responses without bodies immediately.
            // There is nothing to stream, so no need to initiate streaming.
            if (response.body == null) {
              return messageChannel.send({
                type: 'MOCK_RESPONSE',
                payload: response,
              })
            }

            // If the mocked response has a body, stream it to the worker.
            streamResponse(operationChannel, messageChannel, response)
          },
          onMockedResponseSent(
            response,
            { handler, publicRequest, parsedRequest },
          ) {
            if (options.quiet) {
              return
            }

            handler.log(
              publicRequest,
              response,
              handler as RequestHandler,
              parsedRequest,
            )
          },
        },
      )
    } catch (error) {
      if (error instanceof NetworkError) {
        // Treat emulated network error differently,
        // as it is an intended exception in a request handler.
        return messageChannel.send({
          type: 'NETWORK_ERROR',
          payload: {
            name: error.name,
            message: error.message,
          },
        })
      }

      if (error instanceof Error) {
        // Treat all the other exceptions in a request handler
        // as unintended, alerting that there is a problem needs fixing.
        messageChannel.send({
          type: 'INTERNAL_ERROR',
          payload: {
            status: 500,
            body: JSON.stringify({
              errorType: error.constructor.name,
              message: error.message,
              location: error.stack,
            }),
          },
        })
      }
    }
  }
}

function transformResponse(
  response: MockedResponse<string>,
): SerializedResponse<string> {
  return {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers.all(),
    body: response.body,
    delay: response.delay,
  }
}

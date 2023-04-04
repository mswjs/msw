import {
  StartOptions,
  SetupWorkerInternalContext,
  ServiceWorkerIncomingEventsMap,
} from '../glossary'
import {
  ServiceWorkerMessage,
  WorkerChannel,
} from './utils/createMessageChannel'
import { NetworkError } from '~/core/NetworkError'
import { parseWorkerRequest } from '~/core/utils/request/parseWorkerRequest'
import { handleRequest } from '~/core/utils/handleRequest'
import { RequiredDeep } from '~/core/typeUtils'
import { devUtils } from '~/core/utils/internal/devUtils'
import { toResponseInit } from '~/core/utils/toResponseInit'

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
    const messageChannel = new WorkerChannel(event.ports[0])

    const requestId = message.payload.id
    const request = parseWorkerRequest(message.payload)

    try {
      await handleRequest(
        request,
        requestId,
        context.requestHandlers,
        options,
        context.emitter,
        {
          onPassthroughResponse() {
            messageChannel.postMessage('NOT_FOUND')
          },
          async onMockedResponse(
            response,
            { request, handler, parsedRequest },
          ) {
            // Clone the mocked response so its body could be read
            // to buffer to be sent to the worker and also in the
            // ".log()" method of the request handler.
            const responseClone = response.clone()
            const responseInit = toResponseInit(response)
            const responseStream = responseClone.body

            messageChannel.postMessage(
              'MOCK_RESPONSE',
              {
                ...responseInit,
                body: responseStream,
              },
              // Transfer response's buffer so it could
              // be sent over to the worker.
              responseStream ? [responseStream] : undefined,
            )

            if (!options.quiet) {
              context.emitter.once('response:mocked', (response) => {
                handler.log(request, response, parsedRequest)
              })
            }
          },
        },
      )
    } catch (error) {
      if (error instanceof NetworkError) {
        // Treat emulated network error differently,
        // as it is an intended exception in a request handler.
        messageChannel.postMessage('NETWORK_ERROR', {
          name: error.name,
          message: error.message,
        })

        return
      }

      if (error instanceof Error) {
        devUtils.error(
          `Uncaught exception in the request handler for "%s %s":

%s

This exception has been gracefully handled as a 500 response, however, it's strongly recommended to resolve this error, as it indicates a mistake in your code. If you wish to mock an error response, please see this guide: https://mswjs.io/docs/recipes/mocking-error-responses`,
          request.method,
          request.url,
          error.stack ?? error,
        )

        // Treat all other exceptions in a request handler as unintended,
        // alerting that there is a problem that needs fixing.
        messageChannel.postMessage('MOCK_RESPONSE', {
          status: 500,
          statusText: 'Request Handler Error',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: error.name,
            message: error.message,
            stack: error.stack,
          }),
        })
      }
    }
  }
}

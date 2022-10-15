import {
  StartOptions,
  SetupWorkerInternalContext,
  ServiceWorkerIncomingEventsMap,
} from '../glossary'
import {
  ServiceWorkerMessage,
  WorkerChannel,
} from './utils/createMessageChannel'
import { NetworkError } from '../../NetworkError'
import { parseWorkerRequest } from '../../utils/request/parseWorkerRequest'
import { handleRequest } from '../../utils/handleRequest'
import { RequiredDeep } from '../../typeUtils'
import { devUtils } from '../../utils/internal/devUtils'
import { toResponseInit } from '../../utils/toResponseInit'

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
          /**
           * @todo See if this transformation is needed
           * once we adopt "Response".
           */
          // transformResponse,
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
            const responseBuffer = await response.arrayBuffer()

            // If the mocked response has no body, keep it that way.
            // Sending an empty "ArrayBuffer" to the worker will cause
            // the worker constructing "new Response(new ArrayBuffer(0))"
            // which will throw on responses that must have no body (i.e. 204).
            const responseBody = response.body == null ? null : responseBuffer

            messageChannel.postMessage(
              'MOCK_RESPONSE',
              {
                ...responseInit,
                body: responseBody,
              },
              // Transfer response's buffer so it could
              // be sent over to the worker.
              [responseBuffer],
            )

            if (!options.quiet) {
              context.emitter.once('response:mocked', () => {
                handler.log(request, responseClone, parsedRequest)
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

// function transformResponse(response: Response): SerializedResponse<string> {
//   return {
//     status: response.status,
//     statusText: response.statusText,
//     headers: headersToObject(response.headers),
//     body: response.body,
//   }
// }

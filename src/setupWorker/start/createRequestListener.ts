import {
  StartOptions,
  SerializedResponse,
  SetupWorkerInternalContext,
  ServiceWorkerIncomingEventsMap,
} from '../glossary'
import {
  ServiceWorkerMessage,
  WorkerChannel,
} from './utils/createMessageChannel'
import { NetworkError } from '../../utils/NetworkError'
import { parseWorkerRequest } from '../../utils/request/parseWorkerRequest'
import { handleRequest } from '../../utils/handleRequest'
import { RequiredDeep } from '../../typeUtils'
import { MockedResponse } from '../../response'
import { devUtils } from '../../utils/internal/devUtils'
import { serializeResponse } from '../../utils/logging/serializeResponse'

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
    const request = parseWorkerRequest(message.payload)

    try {
      await handleRequest<SerializedResponse>(
        request,
        context.requestHandlers,
        options,
        context.emitter,
        {
          transformResponse,
          onPassthroughResponse() {
            messageChannel.postMessage('NOT_FOUND')
          },
          async onMockedResponse(
            response,
            { handler, publicRequest, parsedRequest },
          ) {
            if (response.body instanceof ReadableStream) {
              throw new Error(
                devUtils.formatMessage(
                  'Failed to construct a mocked response with a "ReadableStream" body: mocked streams are not supported. Follow https://github.com/mswjs/msw/issues/1336 for more details.',
                ),
              )
            }

            const responseInstance = new Response(response.body, response)
            const responseBodyBuffer = await responseInstance.arrayBuffer()

            // If the mocked response has no body, keep it that way.
            // Sending an empty "ArrayBuffer" to the worker will cause
            // the worker constructing "new Response(new ArrayBuffer(0))"
            // which will throw on responses that must have no body (i.e. 204).
            const responseBody =
              response.body == null ? null : responseBodyBuffer

            messageChannel.postMessage(
              'MOCK_RESPONSE',
              {
                ...response,
                body: responseBody,
              },
              [responseBodyBuffer],
            )

            if (!options.quiet) {
              context.emitter.once('response:mocked', async (response) => {
                handler.log(
                  publicRequest,
                  await serializeResponse(response),
                  parsedRequest,
                )
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

import { headersToList } from 'headers-utils'
import {
  StartOptions,
  ResponseWithSerializedHeaders,
  SetupWorkerInternalContext,
  ServiceWorkerIncomingEventsMap,
} from '../../setupWorker/glossary'
import {
  ServiceWorkerMessage,
  createBroadcastChannel,
} from '../createBroadcastChannel'
import { NetworkError } from '../NetworkError'
import { parseWorkerRequest } from '../request/parseWorkerRequest'
import { handleRequest } from '../handleRequest'
import { RequestHandler } from '../../handlers/RequestHandler'

export const createRequestListener = (
  context: SetupWorkerInternalContext,
  options: StartOptions,
) => {
  return async (
    event: MessageEvent,
    message: ServiceWorkerMessage<
      'REQUEST',
      ServiceWorkerIncomingEventsMap['REQUEST']
    >,
  ) => {
    const channel = createBroadcastChannel(event)

    try {
      const request = parseWorkerRequest(message.payload)
      await handleRequest<ResponseWithSerializedHeaders>(
        request,
        context.requestHandlers,
        options,
        context.emitter,
        {
          transformResponse(response) {
            return {
              ...response,
              headers: headersToList(response.headers),
            }
          },
          onBypassResponse() {
            return channel.send({
              type: 'MOCK_NOT_FOUND',
            })
          },
          onMockedResponse(response) {
            channel.send({
              type: 'MOCK_SUCCESS',
              payload: response,
            })
          },
          onMockedResponseSent(
            response,
            { handler, publicRequest, parsedRequest },
          ) {
            if (!options.quiet) {
              handler.log(
                publicRequest,
                response,
                handler as RequestHandler,
                parsedRequest,
              )
            }
          },
        },
      )
    } catch (error) {
      if (error instanceof NetworkError) {
        // Treat emulated network error differently,
        // as it is an intended exception in a request handler.
        return channel.send({
          type: 'NETWORK_ERROR',
          payload: {
            name: error.name,
            message: error.message,
          },
        })
      }

      // Treat all the other exceptions in a request handler
      // as unintended, alerting that there is a problem needs fixing.
      channel.send({
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

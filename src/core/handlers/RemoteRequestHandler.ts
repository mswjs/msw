import type { Socket } from 'socket.io-client'
import { DeferredPromise } from '@open-draft/deferred-promise'
import { HttpHandler } from './HttpHandler'
import type { SyncServerEventsMap } from '../../node/setupRemoteServer'
import {
  serializeRequest,
  deserializeResponse,
} from '../utils/request/serializeUtils'

export class RemoteRequestHandler extends HttpHandler {
  constructor(args: { socket: Socket<SyncServerEventsMap> }) {
    const { socket } = args

    super(/.+/, /.+/, async ({ request, requestId }) => {
      console.log(
        '[msw] RemoteRequestHandler',
        request.method,
        request.url,
        new Date(),
      )

      // Bypass the socket.io HTTP handshake so the sync WS server connection
      // doesn't hang forever. Check this as the first thing to unblock the handling.
      // Keep this predicate as a part of the resolver so that internal requests
      // aren't considered unhandled.
      if (request.headers.get('x-msw-request-type') === 'internal-request') {
        console.log('[msw] INTERNAL SOCKET REQUEST, IGNORE!')
        return
      }

      console.log('[msw] regular request, continue...')

      console.log('[msw] emitting "request" ws event')
      socket.emit('request', {
        requestId,
        serializedRequest: await serializeRequest(request),
      })

      const responsePromise = new DeferredPromise<Response | undefined>()

      /**
       * @todo Handle timeouts.
       * @todo Handle socket errors.
       */
      socket.on('response', (serializedResponse) => {
        const response = serializedResponse
          ? deserializeResponse(serializedResponse)
          : undefined

        responsePromise.resolve(response)
      })

      return await responsePromise
    })
  }
}

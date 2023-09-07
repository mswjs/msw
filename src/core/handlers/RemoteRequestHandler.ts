import type { Socket } from 'socket.io-client'
import { DeferredPromise } from '@open-draft/deferred-promise'
import { HttpHandler } from './HttpHandler'
import type { SyncServerEventsMap } from '../../node/setupRemoteServer'
import {
  deserializeResponse,
  serializeRequest,
} from '../utils/request/serializeUtils'

export class RemoteRequestHandler extends HttpHandler {
  constructor(args: {
    requestId: string
    socketPromise: Promise<Socket<SyncServerEventsMap> | undefined>
  }) {
    super(/.+/, /.+/, async ({ request }) => {
      // Bypass the socket.io HTTP handshake so the sync WS server connection
      // doesn't hang forever. Check this as the first thing to unblock the handling.
      // Keep this predicate as a part of the resolver so that internal requests
      // aren't considered unhandled.
      if (request.headers.get('x-msw-request-type') === 'internal-request') {
        return
      }

      const socket = await args.socketPromise

      // If the sync server hasn't been started or failed to connect,
      // skip this request handler altogether, it has no effect.
      if (socket == null) {
        return
      }

      socket.emit('request', await serializeRequest(request), args.requestId)

      const responsePromise = new DeferredPromise<Response | undefined>()

      /**
       * @todo Handle timeouts.
       * @todo Handle socket errors.
       */
      socket.on('response', (serializedResponse) => {
        responsePromise.resolve(
          serializedResponse
            ? deserializeResponse(serializedResponse)
            : undefined,
        )
      })

      return await responsePromise
    })
  }
}

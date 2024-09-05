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
      socket.emit('request', {
        requestId,
        serializedRequest: await serializeRequest(request),
      })

      const responsePromise = new DeferredPromise<Response | undefined>()

      /**
       * @todo Handle timeouts.
       * @todo Handle socket errors.
       */
      socket.on('response', ({ serializedResponse }) => {
        const response = serializedResponse
          ? deserializeResponse(serializedResponse)
          : undefined

        responsePromise.resolve(response)
      })

      return await responsePromise
    })
  }
}

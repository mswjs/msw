import type { Socket } from 'socket.io-client'
import { DeferredPromise } from '@open-draft/deferred-promise'
import type { NetworkPacket } from '.'
import type { SessionSocket } from '../session'
import { emitReadableStream, WebSocketReadableStreamSource } from '../utils'
import type { StreamEventMap } from '../events'

export interface SerializedRequest {
  method: string
  url: string
  headers: Array<[string, string]>
  hasBodyStream: boolean
}

export interface SerializedResponse {
  status: number
  statusText: string
  headers: Array<[string, string]>
  hasBodyStream: boolean
}

export class HttpPacket implements NetworkPacket {
  constructor(private readonly request: Request) {}

  async send(socket: SessionSocket): Promise<Response | undefined> {
    const intentionPromise = new DeferredPromise<Response | undefined>()
    const serializedRequest = serializeHttpRequest(this.request)

    socket.emit('request', serializedRequest)

    if (this.request.body != null) {
      emitReadableStream(this.request.body, socket)
    }

    socket.once('response', (serializedResponse) => {
      const response =
        serializedResponse != null
          ? deserializeHttpResponse(serializedResponse, socket)
          : undefined

      intentionPromise.resolve(response)
    })

    return intentionPromise
  }
}

export function serializeHttpRequest(request: Request): SerializedRequest {
  return {
    method: request.method,
    url: request.url,
    headers: Array.from(request.headers),
    hasBodyStream: request.body != null,
  }
}

export function deserializeHttpRequest(
  serializedRequest: SerializedRequest,
  socket: Socket<StreamEventMap, any>,
): Request {
  const { method, url, headers, hasBodyStream } = serializedRequest

  return new Request(url, {
    method,
    headers,
    body: hasBodyStream
      ? new ReadableStream(new WebSocketReadableStreamSource(socket))
      : null,
  })
}

export function serializeHttpResponse(response: Response): SerializedResponse {
  return {
    status: response.status,
    statusText: response.statusText,
    headers: Array.from(response.headers),
    hasBodyStream: response.body != null,
  }
}

export function deserializeHttpResponse(
  serializedResponse: SerializedResponse,
  socket: SessionSocket,
): Response {
  const { status, statusText, headers, hasBodyStream } = serializedResponse

  return new Response(
    hasBodyStream
      ? new ReadableStream(new WebSocketReadableStreamSource(socket))
      : null,
    {
      status,
      statusText,
      headers,
    },
  )
}

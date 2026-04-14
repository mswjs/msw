import { createRequestId, FetchResponse } from '@mswjs/interceptors'
import { DeferredPromise } from '@open-draft/deferred-promise'
import type { NetworkPacket } from '.'
import type { SessionSocket } from '../session'

export interface SerializedHttpRequest {
  id: string
  url: string
  method: string
  headers: Array<[string, string]>
  cache: RequestCache
  credentials: RequestCredentials
  destination: RequestDestination
  integrity: string
  redirect: RequestRedirect
  referrer: string
  referrerPolicy: ReferrerPolicy
  keepalive: boolean
  hasBody: boolean
}

export interface SerializedHttpResponse {
  url: string
  status: number
  statusText: string
  headers: Array<[string, string]>
  hasBody: boolean
}

export class HttpPacket implements NetworkPacket {
  static serializeRequest(request: Request): SerializedHttpRequest {
    return {
      id: createRequestId(),
      url: request.url,
      method: request.method,
      headers: Array.from(request.headers),
      cache: request.cache,
      credentials: request.credentials,
      destination: request.destination,
      integrity: request.integrity,
      redirect: request.redirect,
      referrer: request.referrer,
      referrerPolicy: request.referrerPolicy,
      keepalive: request.keepalive,
      hasBody: request.body != null,
    }
  }

  static deserializeRequest(serializedRequest: SerializedHttpRequest): Request {
    return new Request(serializedRequest.url, {
      ...serializedRequest,
    })
  }

  static serializeResponse(response: Response): SerializedHttpResponse {
    return {
      url: response.url,
      status: response.status,
      statusText: response.statusText,
      headers: Array.from(response.headers),
      hasBody: response.body != null,
    }
  }

  static deserializeResponse(
    serializedResponse: SerializedHttpResponse,
  ): Response {
    return new FetchResponse('TODO', {
      ...serializedResponse,
    })
  }

  #request: Request

  constructor(request: Request) {
    this.#request = request
  }

  async send(socket: SessionSocket) {
    const responsePromise = new DeferredPromise<Response | undefined>()
    const serializedRequest = HttpPacket.serializeRequest(this.#request)

    socket.emit('request', serializedRequest)

    if (this.#request.body != null) {
      /** @todo Stream request body */
    }

    socket.on('response', (serializedResponse) => {
      if (serializedResponse == null) {
        return
      }

      const response =
        serializedResponse != null
          ? HttpPacket.deserializeResponse(serializedResponse)
          : undefined

      responsePromise.resolve(response)
    })

    return responsePromise
  }
}

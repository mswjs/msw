import { invariant, InvariantError } from 'outvariant'
import { encode, decode } from '@msgpack/msgpack'

export type NetworkProtocol = 'http' | 'ws'

type HttpIntentRespond = { action: 'respond'; response: Response }
type HttpIntentError = { action: 'error'; reason?: unknown }
type HttpIntentPassthrough = { action: 'passthrough' }

export type HttpIntent =
  | HttpIntentRespond
  | HttpIntentError
  | HttpIntentPassthrough

export type WebSocketIntent =
  | { action: 'client/send'; payload: unknown }
  | { action: 'client/close'; code?: number; reason?: string }
  | { action: 'server/connect' }
  | { action: 'server/send'; payload: unknown }
  | { action: 'server/close'; code?: number; reason?: string }

export type NetworkIntent = HttpIntent | WebSocketIntent

export type NetworkEntry = {
  protocol: 'http'
  id: string
  request: Request
}

export type DecodedNetworkMessage =
  | {
      type: 'start'
      id: string
      protocol: 'http'
      request: {
        url: string
        method: string
        headers?: Array<[string, string]>
        hasBody: boolean
      }
    }
  | {
      type: 'start'
      id: string
      protocol: 'ws'
      websocket: {
        url: string
      }
    }
  | { type: 'push'; id: string; data: unknown }
  | { type: 'end'; id: string }

export const intent = {
  http: {
    respondWith(response: Response): HttpIntentRespond {
      return { action: 'respond', response }
    },
    errorWith(reason?: unknown): HttpIntentError {
      return { action: 'error', reason }
    },
    passthrough(): HttpIntentPassthrough {
      return { action: 'passthrough' }
    },
  },
}

export type NetworkEncoderPayload<Protocol extends NetworkProtocol> =
  Protocol extends 'http'
    ? { id: string; request: Request }
    : Protocol extends 'ws'
      ? { url: URL }
      : never

export class NetworkEncoder {
  public encode<Protocol extends NetworkProtocol>(
    protocol: Protocol,
    payload: NetworkEncoderPayload<Protocol>,
  ): Uint8Array {
    if (protocol === 'http') {
      return encode({
        protocol: 'http',
        id: payload.id,
      } satisfies DecodedNetworkMessage)
    }

    throw new Error('...')
  }
}

export class NetworkDecoder {
  #pendingStreams: Map<string, ReadableStreamDefaultController>

  constructor() {
    this.#pendingStreams = new Map()
  }

  public decode(data: Uint8Array): NetworkEntry | null {
    const message = decode(data) as DecodedNetworkMessage

    if (message.type === 'start') {
      if (message.protocol === 'http') {
        const request = new Request(message.request.url, {
          headers: new Headers(message.request.headers),
          body: message.request.hasBody
            ? new ReadableStream({
                start: (controller) => {
                  this.#pendingStreams.set(message.id, controller)
                },
              })
            : undefined,
        })

        return {
          protocol: 'http',
          id: message.id,
          request,
        }
      }

      if (message.protocol === 'ws') {
        return {
          protocol: 'ws',
          id: message.id,
        }
      }

      throw new InvariantError(
        'Failed to decode network entry: expected a valid message protocol but got "%s"',
        message.protocol,
      )
    }

    if (message.type === 'push') {
      const controller = this.#pendingStreams.get(message.id)

      invariant(
        controller,
        'Failed to process network entry stream chunk: no stream controller found for message "%s"',
        message.id,
      )

      controller.enqueue(message.data)
      return null
    }

    if (message.type === 'end') {
      const controller = this.#pendingStreams.get(message.id)
      controller?.close()
      return null
    }

    throw new InvariantError(
      'Failed to decode network entry: unknown entry type "%s"',
      // @ts-expect-error Runtime edge-case handling.
      message.type,
    )
  }

  public free(): void {
    this.#pendingStreams.clear()
  }
}

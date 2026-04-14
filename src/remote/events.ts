import type {
  SerializedHttpRequest,
  SerializedHttpResponse,
} from './packets/http-packet'

export type StreamEventMap = {
  'stream:chunk': (chunk: Uint8Array | undefined) => void
  'stream:error': (reason?: unknown) => void
  'stream:end': () => void
}

export type NetworkSessionEventMap = StreamEventMap & {
  request: (request: SerializedHttpRequest) => void
}

export type RpcServerEventMap = StreamEventMap & {
  response: (response: SerializedHttpResponse | undefined) => void
}

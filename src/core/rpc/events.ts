import type {
  SerializedRequest,
  SerializedResponse,
} from './packets/http-packet'

export type StreamEventMap = {
  'stream:chunk': (chunk: Uint8Array | undefined) => void
  'stream:error': (reason?: unknown) => void
  'stream:end': () => void
}

export type NetworkSessionEventMap = StreamEventMap & {
  request: (request: SerializedRequest) => void
}

export type RpcServerEventMap = StreamEventMap & {
  response: (response: SerializedResponse | undefined) => void
}

import {
  NetworkEncoder,
  NetworkEncoderPayload,
  type NetworkIntent,
  type NetworkProtocol,
} from '.'

/**
 * Network bridge client to send network events to a different process.
 */
export class NetworkBridgeSender {
  #encoder: NetworkEncoder
  #client: WebSocket

  constructor(readonly options: { port: number }) {
    this.#encoder = new NetworkEncoder()
    this.#client = new WebSocket(new URL(`ws://localhost:${options.port}`))
  }

  public dispatch<Protocol extends NetworkProtocol>(
    protocol: Protocol,
    payload: NetworkEncoderPayload<Protocol>,
  ) {
    this.#client.send(this.#encoder.encode(protocol, payload))

    return new Promise<NetworkIntent>((resolve) => {
      this.#client.addEventListener('message', (event) => {
        /** @todo Decode the intent here */
        /** @todo Remove this listener once intent is received */
      })
    })
  }
}

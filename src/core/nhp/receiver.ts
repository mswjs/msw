import { invariant } from 'outvariant'
import { WebSocketServer } from 'ws'
import { Emitter, TypedEvent } from 'rettime'
import { DeferredPromise } from '@open-draft/deferred-promise'
import { NetworkDecoder, NetworkEntry, type NetworkIntent } from '.'

type NetworkBridgeEventMap = {
  http: HttpEntryEvent
}

class HttpEntryEvent<
  DataType = { requestId: string; request: Request },
  ReturnType extends NetworkIntent = NetworkIntent,
  EventType extends string = string,
> extends TypedEvent<DataType, ReturnType, EventType> {}

/**
 * Creates a network bridge server that handles network events
 * dispatched from a remote process.
 */
export class NetworkBridgeReceiver extends Emitter<NetworkBridgeEventMap> {
  #server?: WebSocketServer
  #decoder: NetworkDecoder

  constructor() {
    super()
    this.#decoder = new NetworkDecoder()
  }

  #createNetworkEntryEvent(
    entry: NetworkEntry,
  ): Emitter.EventType<typeof this, 'http'> {
    return new HttpEntryEvent('http', {
      data: {
        requestId: entry.id,
        request: entry.request,
      },
    })

    /** @todo Other protocols, like "ws" */
  }

  public get url(): URL {
    invariant(
      this.#server,
      'Failed to retrieve network bridge URL: server not running. Did you forget to call `.listen()`?',
    )

    const address = this.#server.address()

    invariant(
      address,
      'Failed to open remote network bridge: server address is null',
    )

    return typeof address === 'string'
      ? new URL(address)
      : new URL(`ws://localhost:${address.port}`)
  }

  public async open(options?: { port?: number }): Promise<void> {
    const connectionPromise = new DeferredPromise<void>()

    const server = new WebSocketServer({
      port: options?.port,
    })
    this.#server = server

    server.on('connection', (client) => {
      client.on('message', (data) => {
        if (!(data instanceof Uint8Array)) {
          return
        }

        const entry = this.#decoder.decode(data as any as Uint8Array)

        if (!entry) {
          return
        }

        for (const intent of this.emitAsGenerator(
          this.#createNetworkEntryEvent(entry),
        )) {
          if (intent) {
            client.send(encode(intent))
            break
          }
        }
      })

      connectionPromise.resolve()
    })

    return connectionPromise
  }

  public async close(): Promise<void> {
    this.#decoder.free()

    invariant(this.#server, 'Cannot close server before listen')

    const closePromise = new DeferredPromise<void>()

    this.#server.close((error) => {
      if (error) {
        return closePromise.reject(error)
      }
      closePromise.resolve()
    })

    return closePromise
  }
}

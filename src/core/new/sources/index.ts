import { type DefaultEventMap, Emitter, TypedEvent } from 'rettime'

export type NetworkFrame = HttpNetworkFrame | WebSocketFrame

interface BaseNetworkFrame {
  protocol: string
  data: unknown
}

export interface HttpNetworkFrame extends BaseNetworkFrame {
  protocol: 'http'
  data: {
    request: Request
  }
  respondWith: (response?: Response) => void
  errorWith: (reason?: unknown) => void
  passthrough: () => void
}

export interface WebSocketFrame extends BaseNetworkFrame {
  protocol: 'ws'
  TODO: 'TODO' /** @todo */
}

interface NetworkSourceEventMap extends DefaultEventMap {
  frame: TypedEvent<NetworkFrame>
}

export abstract class NetworkSource {
  /**
   * @todo Combine multiple network sources into one.
   */
  static from(...sources: Array<NetworkSource>): NetworkSource {
    if (sources.length > 1) {
      throw new Error('Not implemented')
    }

    return sources[0]
  }

  #emitter: Emitter<NetworkSourceEventMap>

  public on: Emitter<NetworkSourceEventMap>['on']

  constructor() {
    this.#emitter = new Emitter()
    this.on = this.#emitter.on.bind(this.#emitter)
  }

  /**
   * Enables this network source.
   * Once enabled, it will start emitting network frame events.
   */
  public abstract enable(): Promise<unknown>

  public push(frame: NetworkFrame): void {
    this.#emitter.emit(new TypedEvent('frame', { data: frame }))
  }

  public async disable(): Promise<void> {
    this.#emitter.removeAllListeners()
  }
}

/**
 * Defines a new network frame.
 * @param frame Network frame definition
 * @returns A new network frame
 */
export function defineNetworkFrame(frame: NetworkFrame): NetworkFrame {
  return frame
}

import { type DefaultEventMap, Emitter, TypedEvent } from 'rettime'
import type { HttpNetworkFrame } from '../frames/http-frame'
import type { WebSocketFrame } from '../frames/websocket-frame'

export type NetworkFrame = HttpNetworkFrame | WebSocketFrame

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

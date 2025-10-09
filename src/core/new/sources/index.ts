import { type DefaultEventMap, Emitter, TypedEvent } from 'rettime'
import type { HttpNetworkFrame } from '../frames/http-frame'
import type { WebSocketNetworkFrame } from '../frames/websocket-frame'

export type NetworkFrame = HttpNetworkFrame | WebSocketNetworkFrame

interface NetworkSourceEventMap extends DefaultEventMap {
  frame: TypedEvent<NetworkFrame>
}

export abstract class NetworkSource {
  /**
   * Combines multiple network sources into one.
   * @param sources A list of network sources.
   */
  static from(...sources: Array<NetworkSource>): NetworkSource {
    return new BatchNetworkSource(sources)
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

class BatchNetworkSource extends NetworkSource {
  constructor(private readonly sources: Array<NetworkSource>) {
    super()

    this.on = (...args: any[]): any => {
      for (const source of sources) {
        source.on(args[0], args[1])
      }
    }
  }

  public async enable(): Promise<void> {
    await Promise.all(this.sources.map((source) => source.enable()))
  }

  public push(frame: NetworkFrame): void {
    for (const source of this.sources) {
      source.push(frame)
    }
  }

  public async disable(): Promise<void> {
    await super.disable()
    await Promise.all(this.sources.map((source) => source.disable()))
  }
}

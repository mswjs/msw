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

  protected emitter: Emitter<NetworkSourceEventMap>

  public on: Emitter<NetworkSourceEventMap>['on']

  constructor() {
    this.emitter = new Emitter()
    this.on = this.emitter.on.bind(this.emitter)
  }

  /**
   * Enable this source and start the network interception.
   */
  public abstract enable(): Promise<unknown>

  /**
   * Push a new network frame to the underlying handlers.
   * @returns {Promise<void>} A Promise that resolves when the handlers
   * are done handling this frame.
   */
  public async push(frame: NetworkFrame): Promise<void> {
    await this.emitter.emitAsPromise(new TypedEvent('frame', { data: frame }))
  }

  /**
   * Disable this source and stop the network interception.
   */
  public async disable(): Promise<void> {
    this.emitter.removeAllListeners()
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

  public async push(frame: NetworkFrame): Promise<void> {
    await Promise.all(this.sources.map((source) => source.push(frame)))
  }

  public async disable(): Promise<void> {
    await Promise.all(this.sources.map((source) => source.disable()))
    await super.disable()
  }
}

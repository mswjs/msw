import { type DefaultEventMap, Emitter, TypedEvent } from 'rettime'

interface NetworkFrame {
  protocol: string
  /**
   * @fixme This has to be type-safe.
   * Different Frame event classes?
   */
  data: unknown
}

interface NetworkSourceEventMap extends DefaultEventMap {
  frame: TypedEvent<NetworkFrame>
}

export abstract class NetworkSource {
  /**
   * @todo Combine multiple network sources into one.
   */
  static from(...sources: Array<NetworkSource>): NetworkSource {
    throw new Error('Not implemented')
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
  public abstract enable(): Promise<void>

  public push(frame: NetworkFrame): void {
    this.#emitter.emit(new TypedEvent('frame', frame))
  }

  public async disable(): Promise<void> {
    this.#emitter.removeAllListeners()
  }
}

export abstract class NetworkFrame {
  constructor() {
    //
  }

  public abstract respondWith(...args: Array<any>): void
}

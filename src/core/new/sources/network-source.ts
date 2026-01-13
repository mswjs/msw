import { Emitter, TypedEvent } from 'rettime'
import { type NetworkFrame } from '../frames/network-frame'

export type AnyNetworkFrame = NetworkFrame<string, unknown, any>

type NetworkSourceEventMap = {
  frame: TypedEvent<AnyNetworkFrame>
}

export abstract class NetworkSource {
  protected emitter: Emitter<NetworkSourceEventMap>

  constructor() {
    this.emitter = new Emitter()
  }

  public abstract enable(): Promise<unknown>

  public async queue(frame: AnyNetworkFrame): Promise<void> {
    await this.emitter.emitAsPromise(new TypedEvent('frame', { data: frame }))
  }

  public on<Type extends keyof NetworkSourceEventMap>(
    type: Type,
    listener: Emitter.ListenerType<typeof this.emitter, Type>,
  ): void {
    this.emitter.on(type, listener)
  }

  public async disable(): Promise<void> {
    this.emitter.removeAllListeners()
  }
}

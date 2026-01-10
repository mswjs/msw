import { Emitter, TypedEvent } from 'rettime'
import { type HttpNetworkFrame } from '../frames/http-frame'
import { type WebSocketNetworkFrame } from '../frames/websocket-frame'

export type NetworkFrame = HttpNetworkFrame | WebSocketNetworkFrame

type NetworkSourceEventMap<Frame extends NetworkFrame> = {
  frame: TypedEvent<Frame>
}

export abstract class NetworkSource<Frame extends NetworkFrame = NetworkFrame> {
  protected emitter: Emitter<NetworkSourceEventMap<Frame>>

  constructor() {
    this.emitter = new Emitter()
  }

  public abstract enable(): Promise<void>

  public async queue(frame: Frame): Promise<void> {
    await this.emitter.emitAsPromise(new TypedEvent('frame', { data: frame }))
  }

  public on<Type extends keyof NetworkSourceEventMap<Frame>>(
    type: Type,
    listener: Emitter.ListenerType<typeof this.emitter, Type>,
  ): void {
    this.emitter.on(type, listener)
  }

  public async disable(): Promise<void> {
    this.emitter.removeAllListeners()
  }
}

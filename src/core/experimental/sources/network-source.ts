import { InvariantError } from 'outvariant'
import { Emitter, TypedEvent } from 'rettime'
import {
  type NetworkFrame,
  type ExtractFrameEvents,
} from '../frames/network-frame'
import { AnyHandler } from '../handlers-controller'

export type AnyNetworkFrame = NetworkFrame<string, unknown, any>

class NetworkFrameEvent<
  DataType = void,
  ReturnType = void,
  EventType extends string = string,
> extends TypedEvent<DataType, ReturnType, EventType> {
  public frame: AnyNetworkFrame

  constructor(type: string, frame: AnyNetworkFrame) {
    super(...([type, {}] as any))
    this.frame = frame
  }
}

type NetworkSourceEventMap<Frame extends AnyNetworkFrame> = {
  frame: NetworkFrameEvent<Frame>
}

export type ExtractSourceEvents<Source> =
  Source extends NetworkSource<infer Frame> ? ExtractFrameEvents<Frame> : never

export abstract class NetworkSource<
  Frame extends AnyNetworkFrame = AnyNetworkFrame,
> {
  protected emitter: Emitter<NetworkSourceEventMap<Frame>>

  constructor() {
    this.emitter = new Emitter()
  }

  public abstract enable(): Promise<unknown>

  public async queue(frame: Frame): Promise<void> {
    await this.emitter.emitAsPromise(
      // @ts-expect-error Trouble handling a conditional type parameter.
      new NetworkFrameEvent('frame', frame),
    )
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

export function getHandlerKindByFrame(
  frame: AnyNetworkFrame,
): AnyHandler['kind'] {
  switch (frame.protocol) {
    case 'http': {
      return 'request'
    }

    case 'ws': {
      return 'websocket'
    }

    default: {
      throw new InvariantError(
        'Failed to get handler kind by frame: unknown frame protocol "%s"',
        frame.protocol,
      )
    }
  }
}

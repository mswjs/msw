import { Emitter, TypedEvent, type TypedListenerOptions } from 'rettime'
import type { HandlerKind } from '../../handlers/Handler'
import type {
  AnyNetworkFrame,
  ExtractFrameEvents,
} from '../frames/network-frame'

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

export interface NetworkSourceOptions {
  /**
   * Enable this source only while one of the given handler kinds is registered.
   */
  lazy?: {
    enabled: boolean
    handlers: ReadonlyArray<HandlerKind>
  }
}

export abstract class NetworkSource<
  Frame extends AnyNetworkFrame = AnyNetworkFrame,
> {
  protected emitter: Emitter<NetworkSourceEventMap<Frame>>
  public readonly lazy: NonNullable<NetworkSourceOptions['lazy']>

  constructor(options: NetworkSourceOptions = {}) {
    this.emitter = new Emitter()
    this.lazy = options.lazy ?? { enabled: false, handlers: [] }
  }

  public abstract enable(): unknown | Promise<unknown>

  public async queue(frame: Frame): Promise<void> {
    await this.emitter.emitAsPromise(
      // @ts-expect-error Trouble handling a conditional type parameter.
      new NetworkFrameEvent('frame', frame),
    )
  }

  public on<Type extends keyof NetworkSourceEventMap<Frame>>(
    type: Type,
    listener: Emitter.Listener<typeof this.emitter, Type>,
    options?: TypedListenerOptions,
  ): void {
    this.emitter.on(type, listener, options)
  }

  public disable(): void | Promise<void> {}

  public removeAllListeners(): void {
    this.emitter.removeAllListeners()
  }
}

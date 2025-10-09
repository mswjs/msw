import { Emitter, type EventMap } from 'strict-event-emitter'

export abstract class BaseNetworkFrame<
  Protocol extends string,
  Data,
  Events extends EventMap,
> {
  public events: Emitter<Events>

  constructor(
    public readonly protocol: Protocol,
    public readonly data: Data,
  ) {
    this.events = new Emitter<Events>()
  }

  /**
   * Returns a message to be used when this frame goes unhandled.
   */
  public abstract getUnhandledFrameMessage(): Promise<string>
}

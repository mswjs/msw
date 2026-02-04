import { Emitter, type DefaultEventMap } from 'rettime'
import type { AnyHandler } from '../handlers-controller'

export type ExtractFrameEvents<Frame> =
  Frame extends NetworkFrame<any, any, infer Events> ? Events : never

export interface NetworkFrameResolutionContext {
  baseUrl?: string | URL
  quiet?: boolean
}

export abstract class NetworkFrame<
  Protocol extends string,
  Data,
  Events extends DefaultEventMap,
> {
  public events: Emitter<Events>

  constructor(
    public readonly protocol: Protocol,
    public readonly data: Data,
  ) {
    this.events = new Emitter()
  }

  /**
   * Resolve the current frame against the given list of handlers.
   * Optionally, use a custom resolution context to control behaviors
   * like `baseUrl`.
   */
  public abstract resolve(
    handlers: Array<AnyHandler>,
    resolutionContext?: NetworkFrameResolutionContext,
  ): Promise<boolean | null>

  /**
   * Perform this network frame as-is.
   */
  public abstract passthrough(): void

  /**
   * Error the underling network frame.
   * @param reason The reason for the error.
   */
  public abstract errorWith(reason?: unknown): void

  /**
   * Get a message to be used when this frame is unhandled.
   */
  public abstract getUnhandledFrameMessage(): Promise<string>
}

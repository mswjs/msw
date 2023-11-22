import {
  StringifiedResponse,
  ServiceWorkerIncomingEventsMap,
} from '../../glossary'

export interface ServiceWorkerMessage<
  EventType extends keyof ServiceWorkerIncomingEventsMap,
  EventPayload,
> {
  type: EventType
  payload: EventPayload
}

interface WorkerChannelEventsMap {
  MOCK_RESPONSE: [
    data: StringifiedResponse,
    transfer?: [ReadableStream<Uint8Array>],
  ]
  NOT_FOUND: []
}

export class WorkerChannel {
  constructor(private readonly port: MessagePort) {}

  public postMessage<Event extends keyof WorkerChannelEventsMap>(
    event: Event,
    ...rest: WorkerChannelEventsMap[Event]
  ): void {
    const [data, transfer] = rest
    this.port.postMessage(
      { type: event, data },
      {
        // but TypeScript doesn't acknowledge that.
        // eslint-disable-next-line @typescript-eslint/prefer-ts-expect-error
        // @ts-ignore ReadableStream can be transferred, but only in versions 4.8 and lower
        transfer,
      },
    )
  }
}

import {
  SerializedResponse,
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
  MOCK_RESPONSE: [data: SerializedResponse<any>, body?: [ArrayBuffer]]
  NOT_FOUND: []
  NETWORK_ERROR: [data: { name: string; message: string }]
}

export class WorkerChannel {
  constructor(private readonly port: MessagePort) {}

  public postMessage<Event extends keyof WorkerChannelEventsMap>(
    event: Event,
    ...rest: WorkerChannelEventsMap[Event]
  ): void {
    const [data, transfer] = rest
    this.port.postMessage({ type: event, data }, { transfer })
  }
}

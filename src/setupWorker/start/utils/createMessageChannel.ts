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
  MOCK_RESPONSE: (data: SerializedResponse<any>, body?: [ArrayBuffer]) => void
  NOT_FOUND: () => void
  NETWORK_ERROR: (data: { name: string; message: string }) => void
}

export class WorkerChannel {
  constructor(private readonly port: MessagePort) {}

  public postMessage<Event extends keyof WorkerChannelEventsMap>(
    event: Event,
    ...rest: Parameters<WorkerChannelEventsMap[Event]>
  ): void {
    const [data, transfer] = rest
    this.port.postMessage({ type: event, data }, { transfer })
  }
}

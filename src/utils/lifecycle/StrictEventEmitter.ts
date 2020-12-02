import { EventEmitter } from 'events'
import { ResponseWithSerializedHeaders } from '../../setupWorker/glossary'
import { MockedRequest } from '../handlers/requestHandler'

export interface EventsMap {
  'request:start': (req: MockedRequest) => void
  'request:unhandled': (req: MockedRequest) => void
  'request:end': (req: MockedRequest) => void
  'response:mocked': (
    req: MockedRequest,
    res: ResponseWithSerializedHeaders,
  ) => void
  'response:bypass': (req: MockedRequest) => void
}

export class StrictEventEmitter extends EventEmitter {
  constructor() {
    super()
  }

  emit<EventType extends keyof EventsMap>(
    eventType: EventType,
    ...data: Parameters<EventsMap[EventType]>
  ) {
    return super.emit(eventType, ...data)
  }

  addEventListener<EventType extends keyof EventsMap>(
    eventType: EventType,
    listener: EventsMap[EventType],
  ) {
    super.addListener(eventType, listener)
  }
}

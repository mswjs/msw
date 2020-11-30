import { EventEmitter } from 'events'
import { ResponseWithSerializedHeaders } from './setupWorker/glossary'
import { MockedRequest } from './utils/handlers/requestHandler'

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

export class LifecycleEventEmitter {
  private emitter: EventEmitter

  constructor() {
    this.emitter = new EventEmitter()
  }

  emit<EventType extends keyof EventsMap>(
    eventType: EventType,
    ...data: Parameters<EventsMap[EventType]>
  ) {
    this.emitter.emit(eventType, ...data)
  }

  addEventListener<EventType extends keyof EventsMap>(
    eventType: EventType,
    listener: EventsMap[EventType],
  ) {
    this.emitter.addListener(eventType, listener)
  }
}

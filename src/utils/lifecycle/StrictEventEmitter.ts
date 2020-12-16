import { EventEmitter } from 'events'

export class StrictEventEmitter<
  EventsMap extends Record<string | symbol, any>
> extends EventEmitter {
  constructor() {
    super()
  }

  emit<EventType extends keyof EventsMap>(
    eventType: EventType,
    ...data: Parameters<EventsMap[EventType]>
  ) {
    if (typeof eventType !== 'string') {
      return false
    }

    return super.emit(eventType, ...data)
  }

  addEventListener<EventType extends keyof EventsMap>(
    eventType: EventType,
    listener: EventsMap[EventType],
  ) {
    if (typeof eventType !== 'string') {
      return
    }

    super.addListener(eventType, listener)
  }
}

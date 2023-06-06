import { type EventMap, type Emitter } from 'strict-event-emitter'
import {
  SerializedRequest,
  SerializedResponse,
  deserializeRequest,
  deserializeResponse,
  isSerializedRequest,
  isSerializedResponse,
  serializeRequest,
  serializeResponse,
} from '../request/serializeUtils'

export type TransformEventsFunction<
  FromEvents extends EventMap,
  ToEvents extends { [EventName in keyof FromEvents]: unknown },
> = <EventName extends keyof FromEvents>(
  eventName: EventName,
  args: FromEvents[EventName],
) => Promise<ToEvents[EventName]>

export function onAnyEvent<Events extends EventMap>(
  emitter: Emitter<Events>,
  listener: <EventName extends keyof Events>(
    eventName: EventName,
    ...args: Events[EventName]
  ) => void,
): void {
  const rawEmit = emitter.emit

  emitter.emit = function (eventName, ...args) {
    listener(eventName, ...args)
    return rawEmit.call(this, eventName, ...args)
  }
}

export async function serializeEventPayload(
  payload: Array<unknown>,
): Promise<Array<unknown>> {
  return Promise.all(
    payload.map(async (data) => {
      if (data instanceof Request) {
        return serializeRequest(data)
      }

      if (data instanceof Response) {
        return serializeResponse(data)
      }

      return data
    }),
  )
}

export async function deserializeEventPayload(
  payload: Array<SerializedRequest | SerializedResponse | unknown>,
): Promise<Array<unknown>> {
  return Promise.all(
    payload.map(async (data) => {
      if (isSerializedRequest(data)) {
        return deserializeRequest(data)
      }

      if (isSerializedResponse(data)) {
        return deserializeResponse(data)
      }

      return data
    }),
  )
}

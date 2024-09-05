import { type EventMap, type Emitter } from 'strict-event-emitter'
import type { LifeCycleEventsMap } from '../../sharedOptions'
import {
  type SerializedRequest,
  type SerializedResponse,
  deserializeRequest,
  deserializeResponse,
  isSerializedRequest,
  isSerializedResponse,
  serializeRequest,
  serializeResponse,
} from '../request/serializeUtils'

export type SerializedLifeCycleEventListenerArgs<
  Args extends LifeCycleEventsMap[keyof LifeCycleEventsMap][0],
> = {
  [Key in keyof Args]: Args[Key] extends Request
    ? SerializedRequest
    : Args[Key] extends Response
      ? SerializedResponse
      : Args[Key]
}

export type SerializedLifeCycleEventsMap = {
  [Type in keyof LifeCycleEventsMap]: [
    SerializedLifeCycleEventListenerArgs<LifeCycleEventsMap[Type][0]>,
  ]
}

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

export async function serializeEventPayload<
  Args extends LifeCycleEventsMap[keyof LifeCycleEventsMap][0],
>(args: Args): Promise<SerializedLifeCycleEventListenerArgs<Args>> {
  const serializedArgs = {} as SerializedLifeCycleEventListenerArgs<Args>

  for (const key in args) {
    const value = args[key]

    if (value instanceof Request) {
      Reflect.set(serializedArgs, key, await serializeRequest(value))
      continue
    }

    if (value instanceof Response) {
      Reflect.set(serializedArgs, key, await serializeResponse(value))
      continue
    }

    Reflect.set(serializedArgs, key, value)
  }

  return serializedArgs
}

export async function deserializeEventPayload(
  serializedArgs: SerializedLifeCycleEventsMap[keyof LifeCycleEventsMap],
): Promise<LifeCycleEventsMap[keyof LifeCycleEventsMap][0]> {
  const args = {} as LifeCycleEventsMap[keyof LifeCycleEventsMap][0]

  for (const key in serializedArgs) {
    const value = serializedArgs[key]

    if (isSerializedRequest(value)) {
      Reflect.set(args, key, deserializeRequest(value))
      continue
    }

    if (isSerializedResponse(value)) {
      Reflect.set(args, key, deserializeResponse(value))
      continue
    }

    Reflect.set(args, key, value)
  }

  return args
}

import { EventEmitter } from 'stream'

/**
 * Pipes all emitted events from one emitter to another.
 */
export function pipeEvents(
  source: EventEmitter,
  destination: EventEmitter,
): void {
  const rawEmit = source.emit

  // @ts-ignore
  if (rawEmit._isPiped) {
    return
  }

  source.emit = function (event, ...data) {
    destination.emit(event, ...data)
    return rawEmit.call(this, event, ...data)
  }

  // @ts-ignore
  source.emit._isPiped = true
}

import type { Emitter, DefaultEventMap } from 'rettime'

/**
 * Pipes all emitted events from one emitter to another.
 */
export function pipeEvents<EventMap extends DefaultEventMap>(
  source: Emitter<EventMap>,
  destination: Emitter<EventMap>,
): void {
  const rawEmit: typeof source.emit & { _isPiped?: boolean } = source.emit

  if (rawEmit._isPiped) {
    return
  }

  const sourceEmit: typeof source.emit & { _isPiped?: boolean } =
    function sourceEmit(this: typeof source, event) {
      destination.emit(event)
      return rawEmit.call(this, event)
    }

  sourceEmit._isPiped = true

  source.emit = sourceEmit
}

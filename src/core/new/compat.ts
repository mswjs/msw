/**
 * Collection of helpers for briding the compatibility between the old and the new APIs.
 */
import { Emitter } from 'rettime'
import {
  Emitter as LegacyEmitter,
  EventMap as LegacyEventMap,
} from 'strict-event-emitter'
import { type UnhandledRequestStrategy } from '~/core/utils/request/onUnhandledRequest'
import {
  onUnhandledFrame,
  type UnhandledFrameCallback,
} from './on-unhandled-frame'

export function toLegacyEmitter<EventMap extends LegacyEventMap>(
  emitter: Emitter<any>,
): LegacyEmitter<EventMap> {
  const legacy = new LegacyEmitter<EventMap>()

  legacy
    .addListener('newListener', (type, listener) => {
      emitter.on(type as any, (event) => listener(event.data))
    })
    .addListener('removeListener', (type, listener) => {
      emitter.removeListener(type as any, listener)
    })

  return legacy
}

export function fromLegacyOnUnhandledRequest(
  getLegacyValue: () => UnhandledRequestStrategy | undefined,
): UnhandledFrameCallback {
  return ({ frame, defaults }) => {
    const legacyOnUnhandledRequestStrategy = getLegacyValue()

    if (legacyOnUnhandledRequestStrategy === undefined) {
      return
    }

    if (typeof legacyOnUnhandledRequestStrategy === 'function') {
      const request =
        frame.protocol === 'http'
          ? frame.data.request
          : new Request(frame.data.connection.client.url, {
              headers: {
                connection: 'upgrade',
                upgrade: 'websocket',
              },
            })

      return legacyOnUnhandledRequestStrategy(request, {
        warning: defaults.warn,
        error: defaults.error,
      })
    }

    return onUnhandledFrame(frame, legacyOnUnhandledRequestStrategy)
  }
}

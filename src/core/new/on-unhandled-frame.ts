import { UnhandledRequestStrategy } from 'src/iife'
import { isCommonAssetRequest } from '../isCommonAssetRequest'
import { devUtils, InternalError } from '../utils/internal/devUtils'
import { type NetworkFrame } from './sources/network-source'

export type UnhandledFrameHandle =
  | UnhandledFrameStrategy
  | UnhandledFrameCallback

export type UnhandledFrameStrategy = 'bypass' | 'warn' | 'error'

export type UnhandledFrameCallback = (args: {
  frame: NetworkFrame
  defaults: UnhandledFrameDefaults
}) => Promise<void> | void

export type UnhandledFrameDefaults = {
  warn: () => void
  error: () => void
}

export async function onUnhandledFrame(
  frame: NetworkFrame,
  handle: UnhandledFrameHandle,
): Promise<void> {
  // Ignore unhandled common HTTP assets.
  if (frame.protocol === 'http' && isCommonAssetRequest(frame.data.request)) {
    return
  }

  const applyStrategy = async (strategy: UnhandledFrameStrategy) => {
    if (strategy === 'bypass') {
      return
    }

    const message = frame.getUnhandledFrameMessage()

    switch (strategy) {
      case 'warn': {
        return devUtils.warn('Warning: %s', message)
      }

      case 'error': {
        // Print a developer-friendly error.
        devUtils.error('Error: %s', message)

        return Promise.reject(
          new InternalError(
            devUtils.formatMessage(
              'Cannot bypass a request when using the "error" strategy for the "onUnhandledRequest" option.',
            ),
          ),
        )
      }

      default: {
        throw new InternalError(
          devUtils.formatMessage(
            'Failed to react to an unhandled network frame: unknown strategy "%s". Please provide one of the supported strategies ("bypass", "warn", "error") or a custom callback function as the value of the "onUnhandledRequest" option.',
            strategy satisfies never,
          ),
        )
      }
    }
  }

  if (typeof handle === 'function') {
    return handle({
      frame,
      defaults: {
        warn: applyStrategy.bind(null, 'warn'),
        error: applyStrategy.bind(null, 'error'),
      },
    })
  }

  return applyStrategy(handle)
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

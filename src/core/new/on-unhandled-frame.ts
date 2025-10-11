import { isCommonAssetRequest } from '../isCommonAssetRequest'
import { devUtils, InternalError } from '../utils/internal/devUtils'
import { UnhandledRequestStrategy } from '../utils/request/onUnhandledRequest'
import type { NetworkFrame } from './sources/index'

export type UnhandledFrameStrategy = 'bypass' | 'warn' | 'error'

export type UnhandledFrameDefaults = {
  warn: () => void
  error: () => void
}

export type UnhandledFrameCallback = (args: {
  frame: NetworkFrame
  defaults: UnhandledFrameDefaults
}) => Promise<void> | void

export async function onUnhandledFrame(
  frame: NetworkFrame,
  strategyOrCallback: UnhandledFrameStrategy | UnhandledFrameCallback,
): Promise<void> {
  const applyStrategy = async (strategy: UnhandledFrameStrategy) => {
    if (strategy === 'bypass') {
      return
    }

    const message = await frame.getUnhandledFrameMessage()

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

  if (typeof strategyOrCallback === 'function') {
    return strategyOrCallback({
      frame,
      defaults: {
        warn: applyStrategy.bind(null, 'warn'),
        error: applyStrategy.bind(null, 'warn'),
      },
    })
  }

  // Ignore static assets, framework/bundler requests, modules served via HTTP.
  if (frame.protocol === 'http' && isCommonAssetRequest(frame.data.request)) {
    return
  }

  await applyStrategy(strategyOrCallback)
}

export function fromLegacyOnUnhandledRequest(
  getLegacyValue: () => UnhandledRequestStrategy | undefined,
): UnhandledFrameCallback {
  return ({ frame, defaults }) => {
    if (frame.protocol !== 'http') {
      return
    }

    const legacyOnUnhandledRequestStrategy = getLegacyValue()

    if (legacyOnUnhandledRequestStrategy === undefined) {
      return
    }

    if (typeof legacyOnUnhandledRequestStrategy === 'function') {
      return legacyOnUnhandledRequestStrategy(frame.data.request, {
        warning: defaults.warn,
        error: defaults.error,
      })
    }

    return onUnhandledFrame(frame, legacyOnUnhandledRequestStrategy)
  }
}

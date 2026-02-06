import { isCommonAssetRequest } from '../isCommonAssetRequest'
import { devUtils, InternalError } from '../utils/internal/devUtils'
import { HttpNetworkFrame } from './frames/http-frame'
import { type AnyNetworkFrame } from './sources/network-source'

export type UnhandledFrameHandle =
  | UnhandledFrameStrategy
  | UnhandledFrameCallback

export type UnhandledFrameStrategy = 'bypass' | 'warn' | 'error'

export type UnhandledFrameCallback = (args: {
  frame: AnyNetworkFrame
  defaults: UnhandledFrameDefaults
}) => Promise<void> | void

export type UnhandledFrameDefaults = {
  warn: () => void
  error: () => void
}

export async function onUnhandledFrame(
  frame: AnyNetworkFrame,
  handle: UnhandledFrameHandle,
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

  if (typeof handle === 'function') {
    return handle({
      frame,
      defaults: {
        warn: applyStrategy.bind(null, 'warn'),
        error: applyStrategy.bind(null, 'error'),
      },
    })
  }

  /**
   * Ignore unhandled common HTTP assets.
   * @note Calling this here applies the common assets check
   * only to the scenarios when `onUnhandledFrame` was set to a predefined strategy.
   * When using a custom function, you need to check for common assets manually.
   */
  if (
    frame instanceof HttpNetworkFrame &&
    isCommonAssetRequest(frame.data.request)
  ) {
    return
  }

  return applyStrategy(handle)
}

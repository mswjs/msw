import { isCommonAssetRequest } from '../isCommonAssetRequest'
import { devUtils, InternalError } from '../utils/internal/devUtils'
import type { NetworkFrame } from './sources/index'

export type UnhandledFrameStrategy = 'bypass' | 'warn' | 'error'

export type UnhandledFrameDefaults = {
  warn: () => void
  error: () => void
}

export type UnhandledFrameCallback = (args: {
  frame: NetworkFrame
  defaults: UnhandledFrameDefaults
}) => void

export async function onUnhandledFrame(
  frame: NetworkFrame,
  strategyOrCallback: UnhandledFrameStrategy | UnhandledFrameCallback,
): Promise<void> {
  const applyStrategy = async (strategy: UnhandledFrameStrategy) => {
    if (strategy === 'bypass') {
      return
    }

    const message = await frame.getUnhandledFrameMessage()

    if (strategy === 'warn') {
      return devUtils.warn('Warning: %s', message)
    }

    if (strategy === 'error') {
      return devUtils.error('Error: %s', message)
    }

    throw new InternalError(
      devUtils.formatMessage(
        'Failed to react to an unhandled request: unknown strategy "%s". Please provide one of the supported strategies ("bypass", "warn", "error") or a custom callback function as the value of the "onUnhandledRequest" option.',
        strategy,
      ),
    )
  }

  if (typeof strategyOrCallback === 'function') {
    strategyOrCallback({
      frame,
      defaults: {
        warn: applyStrategy.bind(null, 'warn'),
        error: applyStrategy.bind(null, 'warn'),
      },
    })
    return
  }

  // Ignore static assets, framework/bundler requests, modules served via HTTP.
  if (frame.protocol === 'http' && isCommonAssetRequest(frame.data.request)) {
    return
  }

  await applyStrategy(strategyOrCallback)
}

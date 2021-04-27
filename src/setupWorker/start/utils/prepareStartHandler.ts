import { PartialDeep } from 'type-fest'
import { mergeRight } from '../../../utils/internal/mergeRight'
import {
  SetupWorkerApi,
  SetupWorkerInternalContext,
  StartHandler,
  StartOptions,
} from '../../glossary'

export const DEFAULT_START_OPTIONS: StartOptions = {
  serviceWorker: {
    url: '/mockServiceWorker.js',
    options: null as any,
  },
  quiet: false,
  waitUntilReady: true,
  onUnhandledRequest: 'warn',
  findWorker(scriptURL, mockServiceWorkerUrl) {
    return scriptURL === mockServiceWorkerUrl
  },
}

/**
 * Returns resolved worker start options, merging the default options
 * with the given custom options.
 */
export function resolveStartOptions(
  initialOptions?: PartialDeep<StartOptions>,
): StartOptions {
  return mergeRight(DEFAULT_START_OPTIONS, initialOptions || {}) as StartOptions
}

export function prepareStartHandler(
  handler: StartHandler,
  context: SetupWorkerInternalContext,
): SetupWorkerApi['start'] {
  return (initialOptions) => {
    context.startOptions = resolveStartOptions(initialOptions)
    return handler(context.startOptions, initialOptions || {})
  }
}

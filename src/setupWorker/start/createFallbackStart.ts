import { createFallbackRequestListener } from './createFallbackRequestListener'
import { SetupWorkerInternalContext, StartHandler } from '../glossary'
import { printStartMessage } from './utils/printStartMessage'

export function createFallbackStart(
  context: SetupWorkerInternalContext,
): StartHandler {
  return async function start(options) {
    context.fallbackInterceptor = createFallbackRequestListener(
      context,
      options,
    )

    printStartMessage({
      message: 'Mocking enabled (fallback mode).',
      quiet: options.quiet,
    })

    return undefined
  }
}

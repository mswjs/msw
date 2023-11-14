import { SetupWorkerInternalContext, StopHandler } from '../glossary'
import { printStopMessage } from './utils/printStopMessage'

export function createFallbackStop(
  context: SetupWorkerInternalContext,
): StopHandler {
  return function stop() {
    context.fallbackInterceptor?.dispose()
    printStopMessage({ quiet: context.startOptions?.quiet })
  }
}

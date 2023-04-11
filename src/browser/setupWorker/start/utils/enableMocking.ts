import { devUtils } from '~/core/utils/internal/devUtils'
import { StartOptions, SetupWorkerInternalContext } from '../../glossary'
import { printStartMessage } from './printStartMessage'

/**
 * Signals the worker to enable the interception of requests.
 */
export async function enableMocking(
  context: SetupWorkerInternalContext,
  options: StartOptions,
) {
  context.workerChannel.send('MOCK_ACTIVATE')
  await context.events.once('MOCKING_ENABLED')

  // Warn the developer on multiple "worker.start()" calls.
  // While this will not affect the worker in any way,
  // it likely indicates an issue with the developer's code.
  if (context.isMockingEnabled) {
    devUtils.warn(
      `Found a redundant "worker.start()" call. Note that starting the worker while mocking is already enabled will have no effect. Consider removing this "worker.start()" call.`,
    )
    return
  }

  context.isMockingEnabled = true

  printStartMessage({
    quiet: options.quiet,
    workerScope: context.registration?.scope,
    workerUrl: context.worker?.scriptURL,
  })
}

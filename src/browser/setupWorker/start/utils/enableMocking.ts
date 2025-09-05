import { DeferredPromise } from '@open-draft/deferred-promise'
import { devUtils } from '~/core/utils/internal/devUtils'
import type { StartOptions, SetupWorkerInternalContext } from '../../glossary'
import { printStartMessage } from './printStartMessage'

/**
 * Signals the worker to enable the interception of requests.
 */
export function enableMocking(
  context: SetupWorkerInternalContext,
  options: StartOptions,
): Promise<boolean> {
  const mockingEnabledPromise = new DeferredPromise<boolean>()

  context.workerChannel.postMessage('MOCK_ACTIVATE')
  context.workerChannel.once('MOCKING_ENABLED', async (event) => {
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
    const worker = await context.workerPromise

    printStartMessage({
      quiet: options.quiet,
      workerScope: context.registration?.scope,
      workerUrl: worker.scriptURL,
      client: event.data.client,
    })

    mockingEnabledPromise.resolve(true)
  })

  return mockingEnabledPromise
}

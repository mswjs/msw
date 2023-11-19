import { devUtils } from '~/core/utils/internal/devUtils'
import { SetupWorkerInternalContext, StopHandler } from '../glossary'
import { printStopMessage } from './utils/printStopMessage'

export const createStop = (
  context: SetupWorkerInternalContext,
): StopHandler => {
  return function stop() {
    // Warn developers when calling "worker.stop()" more times than necessary.
    // This likely indicates a mistake in their code.
    if (context.state === 'idle') {
      devUtils.warn(
        'Found a redundant "worker.stop()" call. Note that stopping an idle worker has no effect. Consider removing this "worker.stop()" call.',
      )
      return
    }

    /**
     * Signal the Service Worker to disable mocking for this client.
     * Use this an an explicit way to stop the mocking, while preserving
     * the worker-client relation. Does not affect the worker's lifecycle.
     */
    context.workerChannel.send('MOCK_DEACTIVATE')

    if (context.state !== 'cancelled') {
      context.state = 'idle'
    }

    window.clearInterval(context.keepAliveInterval)

    printStopMessage({ quiet: context.startOptions?.quiet })
  }
}

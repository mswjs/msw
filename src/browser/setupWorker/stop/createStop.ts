import { devUtils } from '~/core/utils/internal/devUtils'
import { SetupWorkerInternalContext, StopHandler } from '../glossary'
import { printStopMessage } from './utils/printStopMessage'

export const createStop = (
  context: SetupWorkerInternalContext,
): StopHandler => {
  return function stop() {
    // Warn developers calling "worker.stop()" more times than necessary.
    // This likely indicates a mistake in their code.
    if (!context.isMockingEnabled) {
      devUtils.warn(
        'Found a redundant "worker.stop()" call. Note that stopping the worker while mocking already stopped has no effect. Consider removing this "worker.stop()" call.',
      )
      return
    }

    /**
     * Signal the Service Worker to disable mocking for this client.
     * Use this an an explicit way to stop the mocking, while preserving
     * the worker-client relation. Does not affect the worker's lifecycle.
     */
    context.workerChannel.send('MOCK_DEACTIVATE')
    context.isMockingEnabled = false
    window.clearInterval(context.keepAliveInterval)

    // Post the internal stop message on the window
    // to let any logic know when the worker has stopped.
    // E.g. the WebSocket client manager needs this to know
    // when to clear its in-memory clients list.
    window.postMessage({ type: 'msw/worker:stop' })

    printStopMessage({ quiet: context.startOptions?.quiet })
  }
}

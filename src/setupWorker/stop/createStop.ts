import { SetupWorkerInternalContext, StopHandler } from '../glossary'
import { printStopMessage } from './utils/printStopMessage'

export const createStop = (
  context: SetupWorkerInternalContext,
): StopHandler => {
  return function stop() {
    /**
     * Signal the Service Worker to disable mocking for this client.
     * Use this an an explicit way to stop the mocking, while preserving
     * the worker-client relation. Does not affect the worker's lifecycle.
     */
    context.workerChannel.send('MOCK_DEACTIVATE')
    window.clearInterval(context.keepAliveInterval)
    printStopMessage({ quiet: context.startOptions?.quiet })
  }
}

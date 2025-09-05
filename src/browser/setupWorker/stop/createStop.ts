import { devUtils } from '~/core/utils/internal/devUtils'
import type { SetupWorkerInternalContext, StopHandler } from '../glossary'
import { printStopMessage } from './utils/printStopMessage'

export const createStop = (
  context: SetupWorkerInternalContext,
): StopHandler => {
  return function stop() {
    if (!context.isMockingEnabled) {
      devUtils.warn(
        'Found a redundant "worker.stop()" call. Notice that stopping the worker after it has already been stopped has no effect. Consider removing this "worker.stop()" call.',
      )
      return
    }

    context.isMockingEnabled = false
    context.emitter.removeAllListeners()
    context.workerChannel.removeAllListeners('RESPONSE')

    window.clearInterval(context.keepAliveInterval)

    // Post the internal stop message on the window
    // to let any logic know when the worker has stopped.
    // E.g. the WebSocket client manager needs this to know
    // when to clear its in-memory clients list.
    window.postMessage({ type: 'msw/worker:stop' })

    printStopMessage({ quiet: context.startOptions?.quiet })
  }
}

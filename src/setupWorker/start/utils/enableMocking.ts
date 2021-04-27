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
  return context.events.once('MOCKING_ENABLED').then(() => {
    printStartMessage(options.quiet)
  })
}

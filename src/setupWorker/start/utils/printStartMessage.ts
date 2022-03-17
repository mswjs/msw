import { SetupWorkerInternalContext } from '../../glossary'
import { devUtils } from '../../../utils/internal/devUtils'

interface PrintStartMessageArgs {
  quiet?: boolean
  message?: string
  scope?: string
  workerLocation?: string
}

/**
 * Prints a worker activation message in the browser's console.
 */
export function printStartMessage(
  context: SetupWorkerInternalContext,
  args: PrintStartMessageArgs = {},
) {
  if (args.quiet) {
    return
  }

  const message = args.message || 'Mocking enabled.'

  console.groupCollapsed(
    `%c${devUtils.formatMessage(message)}`,
    'color:orangered;font-weight:bold;',
  )
  console.log(
    '%cDocumentation: %chttps://mswjs.io/docs',
    'font-weight:bold',
    'font-weight:normal',
  )
  console.log('Found an issue? https://github.com/mswjs/msw/issues')
  console.log('Scope:', context.registration?.scope)
  console.log('Worker script location:', context.worker?.scriptURL)
  console.groupEnd()
}

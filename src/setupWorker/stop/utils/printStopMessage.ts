import { devUtils } from '../../../utils/internal/devUtils'

export function printStopMessage(args: { quiet?: boolean } = {}): void {
  if (args.quiet) {
    return
  }

  console.log(
    `%c${devUtils.formatMessage('Mocking disabled.')}`,
    'color:orangered;font-weight:bold;',
  )
}

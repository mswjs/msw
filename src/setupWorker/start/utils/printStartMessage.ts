/**
 * Prints a worker activation message in the browser's console.
 */
export function printStartMessage(
  args: { quiet?: boolean; message?: string } = {},
) {
  if (args.quiet) {
    return
  }

  const message = args.message || 'Mocking enabled.'

  console.groupCollapsed(
    `%c[MSW] ${message}`,
    'color:orangered;font-weight:bold;',
  )
  console.log(
    '%cDocumentation: %chttps://mswjs.io/docs',
    'font-weight:bold',
    'font-weight:normal',
  )
  console.log('Found an issue? https://github.com/mswjs/msw/issues')
  console.groupEnd()
}

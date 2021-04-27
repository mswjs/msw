/**
 * Prints a worker activation message in the browser's console.
 */
export function printStartMessage(quiet?: boolean) {
  if (quiet) {
    return
  }

  console.groupCollapsed(
    '%c[MSW] Mocking enabled.',
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

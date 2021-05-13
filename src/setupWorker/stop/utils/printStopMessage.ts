export function printStopMessage(args: { quiet?: boolean } = {}): void {
  if (args.quiet) {
    return
  }

  console.log('%c[MSW] Mocking disabled.', 'color:orangered;font-weight:bold;')
}

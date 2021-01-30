/**
 * Return the stack trace frame of a function's invocation.
 */
export function getCallFrame() {
  const frames: string[] = (new Error().stack as string).split('\n')

  // Get the first frame that doesn't reference the library's internal trace.
  // Assume that frame is the invocation frame.
  const rePathIsNotUseful = /(node_modules)?[\/\\]lib[\/\\](umd|esm)[\/\\]|^[^\/\\]*$/
  const declarationFrame = frames.slice(1).find((frame) => {
    return !rePathIsNotUseful.test(frame)
  })

  if (!declarationFrame) {
    return
  }

  // Extract file reference from the stack frame.
  const declarationPath = declarationFrame
    .replace(/\s*at [^()]*\(([^)]+)\)/, '$1')
    .replace(/^@/, '')
  return declarationPath
}

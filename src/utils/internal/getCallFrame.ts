/**
 * Return the stack trace frame of a function's invocation.
 */
export function getCallFrame() {
  // In <IE11, new Error may return an undefined stack
  const stack = (new Error().stack || '') as string
  const frames: string[] = stack.split('\n')

  // Get the first frame that doesn't reference the library's internal trace.
  // Assume that frame is the invocation frame.
  const ignoreFrameRegExp = /(node_modules)?[\/\\]lib[\/\\](umd|esm|iief|cjs)[\/\\]|^[^\/\\]*$/
  const declarationFrame = frames.slice(1).find((frame) => {
    return !ignoreFrameRegExp.test(frame)
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

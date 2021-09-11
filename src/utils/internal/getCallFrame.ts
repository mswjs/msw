const BUILD_FRAME =
  /(node_modules)?[\/\\]lib[\/\\](umd|esm|iief|cjs)[\/\\]|^[^\/\\]*$/

/**
 * Return the stack trace frame of a function's invocation.
 */
export function getCallFrame(error: Error) {
  // In <IE11, new Error may return an undefined stack
  const stack = error.stack

  if (!stack) {
    return
  }

  const frames: string[] = stack.split('\n').slice(1)

  // Get the first frame that doesn't reference the library's internal trace.
  // Assume that frame is the invocation frame.
  const declarationFrame = frames.find((frame) => {
    return !BUILD_FRAME.test(frame)
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

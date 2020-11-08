/**
 * Return the stack trace frame of a function's invocation.
 */
export function getCallFrame() {
  try {
    const inspectionError = new Error()
    inspectionError.name = 'Inspection Error'
    throw inspectionError
  } catch (error) {
    const frames: string[] = error.stack.split('\n')

    // Get the first frame that doesn't reference the library's internal trace.
    // Assume that frame is the invocation frame.
    const declarationFrame = frames.slice(1).find((frame) => {
      return !/(node_modules)?\/lib\/(umd|esm)\//.test(frame)
    })

    if (!declarationFrame) {
      return
    }

    // Extract file reference from the stack frame.
    const [, declarationPath] = declarationFrame.match(/\((.+?)\)$/) || []
    return declarationPath
  }
}

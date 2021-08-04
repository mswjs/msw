import { format } from 'outvariant'

const LIBRARY_PREFIX = '[MSW]'

/**
 * Formats a given message by appending the library's prefix string.
 */
function formatMessage(message: string, ...positionals: any[]): string {
  const interpolatedMessage = format(message, ...positionals)
  return `${LIBRARY_PREFIX} ${interpolatedMessage}`
}

/**
 * Prints a library-specific warning.
 */
function warn(message: string, ...positionals: any[]): void {
  console.warn(formatMessage(message, ...positionals))
}

/**
 * Prints a library-specific error.
 */
function error(message: string, ...positionals: any[]): void {
  console.error(formatMessage(message, ...positionals))
}

export const devUtils = {
  formatMessage,
  warn,
  error,
}

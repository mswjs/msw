/**
 * Determines if the given value is a Node.js exception.
 * Node.js exceptions have additional information, like
 * the `code` and `errno` properties.
 */
export function isNodeException(
  error: unknown,
): error is NodeJS.ErrnoException {
  return !!error && typeof error === 'object' && 'code' in error 
}

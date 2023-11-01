/**
 * Determines if the given value is shaped like a Node.js exception.
 * Node.js exceptions have additional information, like
 * the `code` and `errno` properties.
 *
 * In some environments, particularly jsdom/jest these may not
 * instances of `Error` or its subclasses, despite being similar
 * to them.
 */
export function isNodeExceptionLike(
  error: unknown,
): error is NodeJS.ErrnoException {
  return !!error && typeof error === 'object' && 'code' in error
}

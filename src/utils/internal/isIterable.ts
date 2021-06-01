/**
 * Determines if the given function is an iterator.
 */
export function isIterable<IteratorType>(
  fn: any,
): fn is Generator<IteratorType, IteratorType, IteratorType> {
  if (!fn) {
    return false
  }

  return typeof (fn as Generator<unknown>)[Symbol.iterator] == 'function'
}

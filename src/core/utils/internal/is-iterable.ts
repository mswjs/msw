/**
 * Determines if the given function is an iterator.
 */
export function isIterable<IteratorType>(
  fn: any,
): fn is
  | Iterable<IteratorType, IteratorType, IteratorType>
  | AsyncIterable<IteratorType, IteratorType, IteratorType> {
  if (!fn) {
    return false
  }

  return (
    Reflect.has(fn, Symbol.iterator) || Reflect.has(fn, Symbol.asyncIterator)
  )
}

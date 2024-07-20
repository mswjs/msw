// Redefine these types; the three-parameter forms are only available in TypeScript 5.6 or later.
export interface Iterable<T, TReturn, TNext> {
  [Symbol.iterator](): Iterator<T, TReturn, TNext>
}

export interface AsyncIterable<T, TReturn, TNext> {
  [Symbol.asyncIterator](): AsyncIterator<T, TReturn, TNext>
}

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

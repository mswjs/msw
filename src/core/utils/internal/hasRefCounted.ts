export function hasRefCounted<T extends object>(
  value: T,
): value is T & NodeJS.RefCounted {
  return (
    typeof Reflect.get(value, 'ref') === 'function' &&
    typeof Reflect.get(value, 'unref') === 'function'
  )
}

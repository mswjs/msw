/**
 * Serializes the given Object and converts any of its methods
 * into strings in order to be deserialized back with "eval()".
 */
export default function serialize(obj: Object): string {
  return JSON.stringify(obj, (key, value) => {
    return typeof value === 'function'
      ? `__FUNC__${value.toString()}`
      : value
  })
}

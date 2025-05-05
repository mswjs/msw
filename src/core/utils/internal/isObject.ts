/**
 * Determines if the given value is an object.
 */
export function isObject(value: any): value is Record<string, unknown> {
  return value != null && typeof value === 'object' && !Array.isArray(value)
}

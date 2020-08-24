function isObject(obj: Record<string, any>): boolean {
  return typeof obj === 'object'
}

/**
 * Deeply merges two given objects with the right one
 * having a priority during property assignment.
 */
export function mergeRight(
  a: Record<string, any>,
  b: Record<string, any>,
): Record<string, any> {
  const result = Object.assign({}, a)

  Object.entries(b).forEach(([key, value]) => {
    const existingValue = result[key]

    if (Array.isArray(existingValue) && Array.isArray(value)) {
      result[key] = existingValue.concat(value)
      return
    }

    if (isObject(existingValue) && isObject(value)) {
      result[key] = mergeRight(existingValue, value)
      return
    }

    result[key] = value
  })

  return result
}

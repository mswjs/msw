/**
 * Parses a given string into a JSON.
 * Does not throw an exception on an invalid JSON string.
 */
export function jsonParse<T extends Record<string, any>>(
  value: any,
): T | undefined {
  try {
    return JSON.parse(value)
  } catch (error) {
    return undefined
  }
}

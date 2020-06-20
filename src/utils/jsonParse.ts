/**
 * Parses a given string into a JSON.
 * Does not throw an exception on an invalid JSON string.
 */
export function jsonParse<T extends Record<string, any>>(
  str: string,
): T | undefined {
  try {
    return JSON.parse(str)
  } catch (error) {
    return undefined
  }
}

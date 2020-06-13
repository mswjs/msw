export function jsonParse<T>(str: string): T | undefined {
  try {
    return JSON.parse(str)
  } catch (error) {
    return undefined
  }
}

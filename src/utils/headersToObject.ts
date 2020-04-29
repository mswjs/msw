export type HeadersObject = Record<string, string | string[]>

/**
 * Converts a `Headers` instance into a plain Object.
 * Respects headers with multiple values.
 */
export const headersToObject = (headers: Headers): HeadersObject => {
  let result: HeadersObject = {}

  headers.forEach((value, key) => {
    if (result[key]) {
      result[key] = ([] as string[]).concat(result[key]).concat(value)
    }

    result[key] = value
  })

  return result
}

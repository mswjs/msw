/**
 * Converts a `Headers` instance into a list of header tuples.
 * Useful for compatibility with HTTP headers.
 */
export const headersToArray = (headers: Headers): string[][] => {
  return Array.from((headers as any).entries())
}

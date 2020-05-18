/**
 * Returns a parsed object from a given valid JSON string,
 * otherwise returns as text without parsing.
 */
export function getJsonBody(body: string) {
  try {
    return JSON.parse(body)
  } catch (error) {
    return body
  }
}

import { jsonParse } from './internal/jsonParse'

/**
 * Returns a parsed JSON from a given valid body string,
 * otherwise returns a given body string as-is.
 */
export function getJsonBody(body: string) {
  return jsonParse(body) || body
}

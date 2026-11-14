/**
 * Matches either an optional path parameter (e.g. ":id?"), captured
 * so it can be preserved, or the search and fragment of the URL.
 * A question mark is an optional parameter modifier only when it
 * follows a parameter name and ends the path segment.
 */
const REDUNDANT_CHARACTERS_EXP = /(:[a-zA-Z_]\w*\?(?=[/#]|$))|[?#].*$/g

/**
 * Removes search parameters and the fragment from a given URL string.
 * Unlike `getCleanUrl()` from Interceptors, accepts relative URLs and
 * path patterns (e.g. "/user/:id?") since it never parses the input as a URL.
 */
export function getCleanUrlString(url: string): string {
  return url.replace(REDUNDANT_CHARACTERS_EXP, '$1')
}

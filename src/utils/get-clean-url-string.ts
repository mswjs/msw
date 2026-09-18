const REDUNDANT_CHARACTERS_EXP = /[?|#].*$/g

/**
 * Removes search parameters and the fragment from a given URL string.
 * Unlike `getCleanUrl()` from Interceptors, accepts relative URLs and
 * path patterns (e.g. "/user/:id?") since it never parses the input as a URL.
 */
export function getCleanUrlString(url: string): string {
  // If the URL ends with an optional path parameter, return it as-is.
  if (url.endsWith('?')) {
    return url
  }

  // Otherwise, remove the search and fragment from it.
  return url.replace(REDUNDANT_CHARACTERS_EXP, '')
}

const REDUNDANT_CHARACTERS_EXP = /[\?|#].*$/g

export function getSearchParams(path: string) {
  return new URL(`/${path}`, 'http://localhost').searchParams
}

/**
 * Removes query parameters and hashes from a given URL string.
 */
export function cleanUrl(path: string): string {
  return path.replace(REDUNDANT_CHARACTERS_EXP, '')
}

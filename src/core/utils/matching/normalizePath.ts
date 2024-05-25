import type { Path } from './matchRequestUrl'
import { cleanUrl } from '../url/cleanUrl'
import { getAbsoluteUrl } from '../url/getAbsoluteUrl'

/**
 * Normalizes a given request handler path:
 * - Preserves RegExp.
 * - Removes query parameters and hashes.
 * - Rebases relative URLs against the "baseUrl" or the current location.
 * - Preserves relative URLs in Node.js, unless specified otherwise.
 * - Preserves optional path parameters.
 */
export function normalizePath(path: Path, baseUrl?: string): Path {
  // RegExp paths do not need normalization.
  if (path instanceof RegExp) {
    return path
  }

  const endsWithOptionalPathParameter = pathEndsWithOptionalPathParameter(path)

  const maybeAbsoluteUrl = getAbsoluteUrl(path, baseUrl)

  /**
   * In the case of an optional path parameter (e.g. `/user/:userId?`), the
   * cleanUrl function will remove the trailing question mark.
   * Preserve it to avoid breaking the path pattern matching.
   */
  if (endsWithOptionalPathParameter) {
    return `${cleanUrl(maybeAbsoluteUrl)}?`
  }
  return cleanUrl(maybeAbsoluteUrl)
}

export function pathEndsWithOptionalPathParameter(path: string): boolean {
  const lastSegment = path.split('/').pop()
  if (!lastSegment) {
    return false
  }
  const isParameter = lastSegment.startsWith(':')
  const isOptionalParameter = lastSegment.endsWith('?')
  return isParameter && isOptionalParameter
}

import { Path } from 'node-match-path'
import { cleanUrl } from '../url/cleanUrl'
import { getAbsoluteUrl } from '../url/getAbsoluteUrl'

/**
 * Normalizes a given request handler path:
 * - Preserves RegExp.
 * - Removes query parameters and hashes.
 * - Rebases relative URLs against the "baseUrl" or the current location.
 * - Preserves relative URLs in Node.js, unless specified otherwise.
 */
export function normalizePath(path: Path, baseUrl?: string): Path {
  // RegExp paths do not need normalization.
  if (path instanceof RegExp) {
    return path
  }

  const maybeAbsoluteUrl = getAbsoluteUrl(path, baseUrl)

  return cleanUrl(maybeAbsoluteUrl)
}

import type { Path } from './matchRequestUrl'
import { cleanUrl } from '../url/cleanUrl'
import { getAbsoluteUrl } from '../url/getAbsoluteUrl'

/**
 * Normalizes a given request handler path:
 * - Preserves RegExp.
 * - Removes query parameters and hashes.
 * - Preserves relative URLs in Node.js, unless specified otherwise.
 */
export function normalizePath(path: Path): Path {
  // RegExp paths do not need normalization.
  if (path instanceof RegExp) {
    return path
  }

  const maybeAbsoluteUrl = getAbsoluteUrl(path)

  return cleanUrl(maybeAbsoluteUrl)
}

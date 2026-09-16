import type { Path } from './matchRequestUrl'
import { getCleanUrlString } from '#utils/get-clean-url-string'
import { getAbsoluteUrl } from '../url/getAbsoluteUrl'

/**
 * Normalizes a given request handler path:
 * - Preserves RegExp.
 * - Removes query parameters and hashes.
 * - Rebases relative URLs against the "baseUrl" or the current location.
 * - Preserves relative URLs in Node.js, unless specified otherwise.
 * - Preserves optional path parameters.
 */
export function normalizePath<ThisPath extends Path>(
  path: ThisPath,
  baseUrl?: string,
): ThisPath {
  // RegExp paths do not need normalization.
  if (path instanceof RegExp) {
    return path
  }

  const maybeAbsoluteUrl = getAbsoluteUrl(path, baseUrl)

  return getCleanUrlString(maybeAbsoluteUrl) as ThisPath
}

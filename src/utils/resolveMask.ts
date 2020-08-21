import { Mask } from '../setupWorker/glossary'
import { getAbsoluteUrl } from './getAbsoluteUrl'

/**
 * Converts a given request handler mask into a URL, if given a valid URL string.
 * Otherwise, returns the mask as-is.
 */
export function resolveMask(mask: Mask): URL | RegExp | string {
  if (mask instanceof RegExp) {
    return mask
  }

  try {
    // Attempt to create a URL instance out of the mask string.
    // Resolve mask to an absolute URL, because even a valid relative URL
    // cannot be converted into the URL instance (required absolute URL only).
    return new URL(getAbsoluteUrl(mask))
  } catch (error) {
    // Otherwise, the mask is a path string.
    return mask
  }
}

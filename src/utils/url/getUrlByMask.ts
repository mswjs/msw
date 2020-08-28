import { Mask } from '../../setupWorker/glossary'
import { getAbsoluteUrl } from './getAbsoluteUrl'

/**
 * Converts a given request handler mask into a URL, if given a valid URL string.
 */
export function getUrlByMask(mask: Mask): URL | Mask {
  /**
   * If a string mask contains an asterisk (wildcard), return it as-is.
   * Converting a URL-like path string into an actual URL is misleading.
   * @see https://github.com/mswjs/msw/issues/357
   */
  if (mask instanceof RegExp || mask.includes('*')) {
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

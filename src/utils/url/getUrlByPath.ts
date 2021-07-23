import { Path } from 'node-match-path'
import { getAbsoluteUrl } from './getAbsoluteUrl'

/**
 * Converts a given request handler path into a URL,
 * or returns it as-is if it's not a valid URL (i.e. a RegExp).
 */
export function getUrlByPath(path: Path, baseUrl?: string): URL | Path {
  /**
   * If a string path contains an asterisk (wildcard), return it as-is.
   * Converting a URL-like path string into an actual URL is misleading.
   * @see https://github.com/mswjs/msw/issues/357
   */
  if (path instanceof RegExp || path.includes('*')) {
    return path
  }

  try {
    // Attempt to create a URL instance from a path string.
    // Resolve path to an absolute URL, because even a valid relative URL
    // cannot be converted into the URL instance (required absolute URL only).
    return new URL(getAbsoluteUrl(path, baseUrl))
  } catch (error) {
    // Otherwise, the path is a path string.
    return path
  }
}

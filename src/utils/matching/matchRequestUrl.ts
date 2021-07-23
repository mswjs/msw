import { Path, match } from 'node-match-path'
import { getCleanUrl } from '@mswjs/interceptors/lib/utils/getCleanUrl'
import { normalizePath } from './normalizePath'

/**
 * Returns the result of matching given request URL against a mask.
 */
export function matchRequestUrl(
  url: URL,
  path: Path,
  baseUrl?: string,
): ReturnType<typeof match> {
  const normalizedPath = normalizePath(path, baseUrl)
  return match(normalizedPath, getCleanUrl(url))
}

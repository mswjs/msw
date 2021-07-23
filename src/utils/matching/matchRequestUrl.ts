import { Path, match } from 'node-match-path'
import { getCleanUrl } from '@mswjs/interceptors/lib/utils/getCleanUrl'
import { getUrlByPath } from '../url/getUrlByPath'
import { getCleanMask } from './getCleanMask'

/**
 * Returns the result of matching given request URL against a mask.
 */
export function matchRequestUrl(
  url: URL,
  path: Path,
  baseUrl?: string,
): ReturnType<typeof match> {
  const resolvedPath = getUrlByPath(path, baseUrl)
  const cleanPath = getCleanMask(resolvedPath, baseUrl)

  return match(cleanPath, getCleanUrl(url))
}

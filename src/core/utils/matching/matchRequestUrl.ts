import { matchPattern } from '@msw/url'
import { getCleanUrl } from '@mswjs/interceptors'
import { normalizePath } from './normalizePath'

export type Path = string | RegExp
export type PathParams<KeyType extends keyof any = string> = {
  [ParamName in KeyType]?: string | ReadonlyArray<string>
}

export interface Match {
  matches: boolean
  params?: PathParams
}

export function isPath(value: unknown): value is Path {
  return typeof value === 'string' || value instanceof RegExp
}

/**
 * Match the given URL against a path pattern.
 */
export function matchRequestUrl(
  url: URL,
  pattern: Path,
  baseUrl?: string,
): Match {
  const cleanUrl = getCleanUrl(url)

  if (pattern instanceof RegExp) {
    return {
      matches: pattern.test(cleanUrl),
      params: {},
    }
  }

  // Resolve potentially realive patterns against the baseUrl.
  const normalizedPath = normalizePath(pattern, baseUrl)
  return matchPattern(cleanUrl, normalizedPath)
}

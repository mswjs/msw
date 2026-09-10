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
    const match = pattern.flags.includes('g')
      ? [...cleanUrl.matchAll(pattern)].flat()
      : cleanUrl.match(pattern)

    return {
      matches: match != null && match.length > 0,
      params: Object.fromEntries(
        (match ?? []).slice(1).map((value, index) => [index, value]),
      ),
    }
  }

  // Resolve potentially realive patterns against the baseUrl.
  const normalizedPath = normalizePath(pattern, baseUrl)
  return matchPattern(normalizedPath, cleanUrl)
}

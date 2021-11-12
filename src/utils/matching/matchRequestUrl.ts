import { match } from 'path-to-regexp'
import { getCleanUrl } from '@mswjs/interceptors/lib/utils/getCleanUrl'
import { normalizePath } from './normalizePath'

export type Path = string | RegExp

export type PathParams = Record<string, string | string[]>
export interface Match {
  matches: boolean
  params?: PathParams
}

/**
 * Coerce a path supported by MSW into a path
 * supported by "path-to-regexp".
 */
export function coercePath(path: string): string {
  return (
    path
      /**
       * Escape the protocol so that "path-to-regexp" could match
       * absolute URL.
       * @see https://github.com/pillarjs/path-to-regexp/issues/259
       */
      .replace(/^([^\/]+)(:)(?=\/\/)/g, '$1\\$2')
      /**
       * Replace wildcards ("*") with unnamed capturing groups
       * because "path-to-regexp" doesn't support wildcards.
       * Ignore path parameter' modifiers (i.e. ":name*").
       */
      .replace(/(?<!(^|\/|\*+):[\w]+)(\*{1,2})/g, '(.*)')
  )
}

/**
 * Returns the result of matching given request URL against a mask.
 */
export function matchRequestUrl(url: URL, path: Path, baseUrl?: string): Match {
  const normalizedPath = normalizePath(path, baseUrl)
  const cleanPath =
    typeof normalizedPath === 'string'
      ? coercePath(normalizedPath)
      : normalizedPath
  const cleanUrl = getCleanUrl(url)
  const result = match(cleanPath, { decode: decodeURIComponent })(cleanUrl)
  const params = (result && (result.params as PathParams)) || {}

  return {
    matches: result !== false,
    params,
  }
}

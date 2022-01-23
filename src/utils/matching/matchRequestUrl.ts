import { match } from 'path-to-regexp'
import { getCleanUrl } from '@mswjs/interceptors/lib/utils/getCleanUrl'
import { normalizePath } from './normalizePath'

export type Path = string | RegExp

type IsUnique<
  P extends string,
  R extends string,
> = R extends `${infer _Before}:${P}${infer After}`
  ? IsUnique<P, After> extends true
    ? false
    : true
  : R extends `:${P}/`
  ? true
  : false

type StringOrArray<P extends string, R extends string> = IsUnique<
  P,
  R
> extends true
  ? string
  : ReadonlyArray<string>

export type PathParams<R extends Path> = R extends string
  ? PathParamsString<R>
  : unknown
export type PathParamsString<
  R extends string,
  O extends string = R,
> = R extends `${infer _Before}:${infer P}/${infer After}`
  ? Record<P, StringOrArray<P, O>> & PathParamsString<After, O>
  : R extends `${infer _Before}:${infer P}`
  ? Record<P, StringOrArray<P, O>>
  : R extends `:${infer P}`
  ? Record<P, StringOrArray<P, O>>
  : unknown

export interface Match<R extends Path> {
  matches: boolean
  params?: PathParams<R>
}

/**
 * Coerce a path supported by MSW into a path
 * supported by "path-to-regexp".
 */
export function coercePath(path: string): string {
  return (
    path
      /**
       * Replace wildcards ("*") with unnamed capturing groups
       * because "path-to-regexp" doesn't support wildcards.
       * Ignore path parameter' modifiers (i.e. ":name*").
       */
      .replace(
        /([:a-zA-Z_-]*)(\*{1,2})+/g,
        (_, parameterName: string | undefined, wildcard: string) => {
          const expression = '(.*)'

          if (!parameterName) {
            return expression
          }

          return parameterName.startsWith(':')
            ? `${parameterName}${wildcard}`
            : `${parameterName}${expression}`
        },
      )
      /**
       * Escape the port so that "path-to-regexp" can match
       * absolute URLs including port numbers.
       */
      .replace(/([^\/])(:)(?=\d+)/, '$1\\$2')
      /**
       * Escape the protocol so that "path-to-regexp" could match
       * absolute URL.
       * @see https://github.com/pillarjs/path-to-regexp/issues/259
       */
      .replace(/^([^\/]+)(:)(?=\/\/)/, '$1\\$2')
  )
}

/**
 * Returns the result of matching given request URL against a mask.
 */
export function matchRequestUrl(
  url: URL,
  path: Path,
  baseUrl?: string,
): Match<typeof path> {
  const normalizedPath = normalizePath(path, baseUrl)
  const cleanPath =
    typeof normalizedPath === 'string'
      ? coercePath(normalizedPath)
      : normalizedPath

  const cleanUrl = getCleanUrl(url)
  const result = match(cleanPath, { decode: decodeURIComponent })(cleanUrl)
  const params: PathParams<typeof path> = (result && (result.params)) || {}

  return {
    matches: result !== false,
    params,
  }
}

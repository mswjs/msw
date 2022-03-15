import { match } from 'path-to-regexp'
import { getCleanUrl } from '@mswjs/interceptors/lib/utils/getCleanUrl'
import { normalizePath } from './normalizePath'

export type Path = string | RegExp

type NormalizeParamName<P extends string> = P extends
  | `${infer N}+`
  | `${infer N}*`
  ? N
  : P

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

export type ExtractPathParams<R extends Path> = R extends string
  ? PathParamsString<R>
  : DefaultParamsType

export type PathParamsString<
  R extends string,
  O extends string = R,
> = R extends `${infer _Before}:${infer P}/${infer After}`
  ? Record<NormalizeParamName<P>, StringOrArray<P, O>> &
      PathParamsString<After, O>
  : R extends `${infer _Before}:${infer P}`
  ? Record<NormalizeParamName<P>, StringOrArray<P, O>>
  : R extends `:${infer P}`
  ? Record<NormalizeParamName<P>, StringOrArray<P, O>>
  : DefaultParamsType

export type DefaultParamsType = Record<string, string | string[]>

export interface Match<PathType extends Path> {
  matches: boolean
  params: ExtractPathParams<PathType>
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
 * Matches a given URL against the path.
 */
export function matchRequestUrl<PathType extends Path>(
  url: URL,
  path: PathType,
  baseUrl?: string,
): Match<PathType> {
  const normalizedPath = normalizePath(path, baseUrl)
  const cleanPath =
    typeof normalizedPath === 'string'
      ? coercePath(normalizedPath)
      : normalizedPath

  const cleanUrl = getCleanUrl(url)
  const result = match(cleanPath, { decode: decodeURIComponent })(cleanUrl)
  const params = ((result && result.params) ||
    {}) as ExtractPathParams<PathType>

  return {
    matches: result !== false,
    params,
  }
}

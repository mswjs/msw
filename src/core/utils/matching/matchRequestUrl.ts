import { URLPattern } from 'urlpattern-polyfill'
import type {
  URLPatternResult,
  URLPatternComponentResult,
  URLPatternInput,
} from 'urlpattern-polyfill/dist/types'
import { getCleanUrl } from '@mswjs/interceptors'
import { normalizePath } from './normalizePath'

export type Path = string | RegExp
export type PathParams<KeyType extends keyof any = string> = {
  [ParamName in KeyType]: string | ReadonlyArray<string> | undefined
}

export interface Match {
  matches: boolean
  params?: PathParams
}

function parsePath(
  path: string,
): [input: URLPatternInput | string, (result: URLPatternResult) => PathParams] {
  if (path === '*') {
    return [
      {},
      (result) => {
        return { '0': result.inputs[0] as string }
      },
    ]
  }

  if (path.startsWith('*')) {
    const pathname = path.slice(1)

    return [
      {
        pathname,
      },
      (result) => {
        const url = new URL(result.inputs[0] as string)
        const groups = groupsToArrayObject(
          [result.pathname.groups, result.search.groups],
          // Set the starting index for groups to 1
          // because the URL origin is matched at 0.
          1,
        )

        return {
          '0': url.origin,
          ...groups,
        }
      },
    ]
  }

  return [
    path,
    (result) => {
      return groupsToArrayObject([
        result.protocol.groups,
        result.username.groups,
        result.password.groups,
        result.hostname.groups,
        result.port.groups,
        result.pathname.groups,
        result.search.groups,
      ])
    },
  ]
}

/**
 * Returns the result of matching given request URL against a mask.
 */
export function matchRequestUrl(url: URL, path: Path, baseUrl?: string): Match {
  const normalizedPath = normalizePath(path, baseUrl)
  const cleanUrl = getCleanUrl(url)

  // Handle path predicates as regular expressions.
  if (normalizedPath instanceof RegExp) {
    const result = normalizedPath.exec(cleanUrl)

    return {
      matches: result != null,
      params: result ? regExpExecArrayToParams(result) : {},
    }
  }

  const [input, urlPatternResultToParams] = parsePath(normalizedPath)

  // Handle pathp redicates as path strings (URL patterns).
  /**
   * @fixme URLPattern doesn't support encoding.
   * We need to encode the path by hand.
   */
  const pattern = new URLPattern(input, baseUrl)
  const result = pattern.exec(cleanUrl)

  return {
    matches: result != null,
    params: result ? urlPatternResultToParams(result) : {},
  }
}

/**
 * Convert the result of running `RegExp.prototype.exec`
 * to the parameters object expected by MSW.
 */
function regExpExecArrayToParams(result: RegExpExecArray): PathParams {
  const params: PathParams = result.groups ? result.groups : {}
  const unnamedGroups = result.slice(1)

  for (let index = 0; index < unnamedGroups.length - 1; index++) {
    params[index] = unnamedGroups[index]
  }

  return params
}

function groupsToArrayObject(
  groups: Array<URLPatternComponentResult['groups']>,
  startIndex = 0,
): Record<string, string | string[]> {
  const result: Record<string, string | string[]> = {}
  let accumulativeStartIndex = startIndex

  for (const group of groups) {
    let unnamedGroupsCount = 0

    for (const key in group) {
      const value = group[key]

      /**
       * @fixme Undefined values may be okay to keep.
       * Optional path parameters.
       */
      // Skip group matches withouth values.
      if (value == null || value == '') {
        continue
      }

      // Decode the match values.
      const decodedValue = decodeURIComponent(value)

      /**
       * Handle named group matches.
       * @example "/user/:name"
       * groups: { name: 'john' }
       */
      if (isNaN(Number(key))) {
        if (result[key]) {
          result[key] = Array.prototype.concat([], result[key], decodedValue)
        } else {
          result[key] = decodedValue
        }

        continue
      }

      // Handle unnamed (numeric) group matches.
      const index = accumulativeStartIndex + Number(key)
      result[index] = decodedValue
      unnamedGroupsCount++
    }

    /**
     * Increment the accumulative index with the total
     * count of matches in this group because each group
     * in the match result segment starts from 0, while
     * the path parameter indexes are consequential.
     *
     * @example
     * {
     *   protocol: { groups: { '0': value } },
     *   pathname: { groups: { '0': value } },
     *   search: { groups: { '0': value } },
     * }
     */
    accumulativeStartIndex += unnamedGroupsCount
  }

  return result
}

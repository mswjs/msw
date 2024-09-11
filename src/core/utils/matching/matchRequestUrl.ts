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
  params: PathParams
}

function parsePath(
  path: string,
): [input: URLPatternInput | string, (result: URLPatternResult) => PathParams] {
  if (path === '*') {
    return [
      /**
       * @note Empty input makes URLPattern match everything.
       */
      {},
      (result) => {
        return { '0': result.inputs[0] as string }
      },
    ]
  }

  if (path.startsWith('*')) {
    return [
      {
        pathname: path,
      },
      (result) => {
        const url = new URL(result.inputs[0] as string)

        // Grab the first pathname match because it belongs to the leading wildcard.
        // Then, decrease each subsequent pathname group index by 1 to prevent overlap.
        const firstPathname = result.pathname.groups[0] || ''
        delete result.pathname.groups[0]
        result.pathname.groups = Object.fromEntries(
          Object.entries(result.pathname.groups).map(([key, value]) => [
            isNaN(Number(key)) ? key : String(Number(key) - 1),
            value,
          ]),
        )

        const groups = groupsToArrayObject([
          { 0: url.origin + firstPathname },
          result.pathname.groups,
        ])

        return groups
      },
    ]
  }

  /**
   * @note The path will remain relative in Node.js.
   * In browser and browser-like environments, it's always rebased
   * against the document's base URI. This is mostly for Node.js.
   */
  if (path.startsWith('/') || path.startsWith('./')) {
    return [
      {
        // Construct an extremely unlikely hash string to match.
        hash: '#relative-urls-are-not-supported-in-node',
      },
      () => ({}),
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

  console.log({ path, url, cleanUrl, input })

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

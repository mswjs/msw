/**
 * Match path util from "react-router".
 * @see https://github.com/ReactTraining/react-router
 */
// @ts-ignore
const pathToRegexp = require('path-to-regexp')
import { RegExpOptions } from 'path-to-regexp'
import { RequestParams } from '../handlers/createHandler'

const cache = {}
const cacheLimit = 10000
let cacheCount = 0

export interface MatchPathOptions {
  exact?: boolean
  strict?: boolean
  sensitive?: boolean
}

interface CompilePathResult {
  regexp: RegExp
  keys: Array<{
    name: string
  }>
}

// TODO Replace this with a simpler memoization
function compilePath(path: string, options: RegExpOptions): CompilePathResult {
  const cacheKey = `${options.end}${options.strict}${options.sensitive}`
  const pathCache = cache[cacheKey] || (cache[cacheKey] = {})

  if (pathCache[path]) {
    return pathCache[path]
  }

  const keys = []
  const regexp = pathToRegexp(path, keys, options)
  const result = {
    regexp,
    keys,
  }

  if (cacheCount < cacheLimit) {
    pathCache[path] = result
    cacheCount++
  }

  return result
}

export type FullMatch = {
  matches: boolean
  exact?: boolean
  params?: RequestParams
}

/**
 * Matches a given pathname string against the path.
 */
export default function matchPath(
  path: string,
  expected: RegExp | string,
  options: MatchPathOptions = {},
): FullMatch {
  const { exact = false, strict = false, sensitive = false } = options
  const paths: string[] = [].concat(expected)

  return paths.reduce<FullMatch>((fullMatch, expectedPath) => {
    if (fullMatch && fullMatch.matches) {
      return fullMatch
    }

    const { regexp, keys } = compilePath(expectedPath, {
      end: exact,
      strict,
      sensitive,
    })

    const match = regexp.exec(path)

    if (!match) {
      return {
        matches: false,
      }
    }

    const [url, ...values] = match
    const exactMatch = path === url

    if (exact && !exactMatch) {
      return {
        matches: false,
      }
    }

    const params = keys.reduce(
      (acc, key, index) => ({
        ...acc,
        [key.name]: values[index],
      }),
      {},
    )

    return {
      matches: true,
      // path, // the path used to match
      // match: path === '/' && url === '' ? '/' : url, // the matched portion of the URL
      exactMatch, // whether or not we matched exactly
      params,
    }
  }, null)
}

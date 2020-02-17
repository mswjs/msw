/**
 * Match path util from "react-router".
 * @see https://github.com/ReactTraining/react-router
 */
// @ts-ignore
const pathToRegexp = require('path-to-regexp')
import { RegExpOptions } from 'path-to-regexp'
import { RequestParams } from '../handlers/requestHandler'

const cache = {}
const cacheLimit = 10000
let cacheCount = 0

export interface MatchPathOptions {
  path?: RegExp | string
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
  // path: RegExp | string
  // match: string
  isExact?: boolean
  params?: RequestParams
}

/**
 * Matches a given pathname string against the path.
 */
export default function matchPath(
  pathname: string,
  options: MatchPathOptions = {},
): FullMatch {
  const { path, exact = false, strict = false, sensitive = false } = options
  const paths: string[] = [].concat(path)

  return paths.reduce<FullMatch>((fullMatch, path) => {
    if (fullMatch && fullMatch.matches) {
      return fullMatch
    }

    const { regexp, keys } = compilePath(path, {
      end: exact,
      strict,
      sensitive,
    })

    const match = regexp.exec(pathname)

    if (!match) {
      return { matches: false }
    }

    const [url, ...values] = match
    const isExact = pathname === url

    if (exact && !isExact) {
      return { matches: false }
    }

    return {
      matches: true,
      // path, // the path used to match
      // match: path === '/' && url === '' ? '/' : url, // the matched portion of the URL
      isExact, // whether or not we matched exactly
      params: keys.reduce(
        (acc, key, index) => ({
          ...acc,
          [key.name]: values[index],
        }),
        {},
      ),
    }
  }, null)
}

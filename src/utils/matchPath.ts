/**
 * Match path util from "react-router".
 * @see https://github.com/ReactTraining/react-router
 */
import pathToRegexp, { RegExpOptions } from 'path-to-regexp'

const cache = {}
const cacheLimit = 10000
let cacheCount = 0

interface MatchPathOptions {
  path?: string
  exact?: boolean
  strict?: boolean
  sensitive?: boolean
}

interface CompilePathResult {
  regexp: RegExp
  keys: any[]
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

/**
 * Public API for matching a URL pathname to a path.
 */
export default function matchPath(
  pathname: string,
  options: MatchPathOptions = {},
) {
  if (typeof options === 'string') {
    options = { path: options }
  }

  const { path, exact = false, strict = false, sensitive = false } = options
  const paths = [].concat(path)

  return paths.reduce((matched, path) => {
    if (matched) {
      return matched
    }

    const { regexp, keys } = compilePath(path, {
      end: exact,
      strict,
      sensitive,
    })
    const match = regexp.exec(pathname)

    if (!match) {
      return null
    }

    const [url, ...values] = match
    const isExact = pathname === url

    if (exact && !isExact) {
      return null
    }

    return {
      path, // the path used to match
      url: path === '/' && url === '' ? '/' : url, // the matched portion of the URL
      isExact, // whether or not we matched exactly
      params: keys.reduce((acc, key, index) => {
        return {
          ...acc,
          [key.name]: values[index],
        }
      }, {}),
    }
  }, null)
}

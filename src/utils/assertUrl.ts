import * as R from 'ramda'

export type Mask = string

export interface ParsedUrl {
  url: string
  mask: Mask
  matches: boolean
  params?: {
    [paramName: string]: string
  }
}

const getUrlParamNames = (url: string): string[] => {
  const params = []
  url.replace(/:(\w+)/g, (chunk, paramName) => {
    params.push(paramName)
    return chunk
  })
  return params
}

/**
 * Normalizes the given mask string to be suitable as a RegExp.
 */
const normalizeMask = R.ifElse(
  R.startsWith('__REGEXP__'),
  R.compose(
    R.replace(/(^\/|\/$)/g, ''),
    R.replace('__REGEXP__', ''),
  ),
  R.compose(
    R.join(''),
    R.append('\\/?$'),
    R.replace('*', '.+'),
    R.replace(/:(\w+)/g, '(\\w+)'),
  ),
)

export default function assertUrl(mask: Mask, url: string): ParsedUrl {
  const paramNames = getUrlParamNames(url)
  const normalizedMask = normalizeMask(mask)
  const match = new RegExp(normalizedMask).exec(url)
  const params =
    match &&
    match.slice(1, match.length).reduce((acc, paramValue, index) => {
      const paramName = paramNames[index]
      return {
        ...acc,
        [paramName]: paramValue,
      }
    }, {})

  return {
    url,
    mask,
    matches: !!match,
    params,
  }
}

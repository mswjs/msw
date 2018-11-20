export type Mask = string

export interface ParsedUrl {
  url: string
  mask: Mask
  matches: boolean
  params?: {
    [paramName: string]: string
  }
}

export default function assertUrl(mask: Mask, url: string): ParsedUrl {
  let paramsList = []
  const replacedMask =
    '^' +
    mask
      /**
       * Allows to set "mask" as RegExp, which will be stringified upon the usage
       * as a key in the routes Object. This effectively convert a potential
       * stringified RegExp into its pattern.
       */
      .replace(/(^\/|\/$)/g, '')
      .replace('*', '(.+)')
      .replace(/:(\w+)/g, (_, paramName) => {
        paramsList.push(paramName)
        return '(\\w+)'
      })
      .concat('$')

  const match = new RegExp(replacedMask).exec(url)
  const params =
    match &&
    match.slice(1, match.length).reduce((acc, paramValue, index) => {
      const paramName = paramsList[index]
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

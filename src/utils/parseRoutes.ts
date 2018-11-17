interface ParsedRoute {
  url: string,
  matches: boolean,
  params?: {
    [paramName: string]: any
  }
}

export default function parseRoute(mask: string, route: string): ParsedRoute {
  let paramsList = []
  const replacedMask = mask.replace(/:(\w+)/g, (_, paramName) => {
    paramsList.push(paramName)
    return '(\\w+)'
  })

  const match = new RegExp(replacedMask).exec(route)
  const params = match && match
    .slice(1, match.length)
    .reduce((acc, paramValue, index) => {
      const paramName = paramsList[index]
      return {
        ...acc,
        [paramName]: paramValue,
      }
    }, {})

  return {
    url: route,
    matches: !!match,
    params,
  }
}
self.addEventListener('install', function (event) {
  event.waitUntil(self.skipWaiting())
})

self.addEventListener('activate', function (event) {
  event.waitUntil(self.clients.claim())
  console.log('%cMockServiceWorker is activated!', 'color:green;font-weight:bold;')
})

self.addEventListener('message', function (event) {
  const payload = event.data

  switch (payload.type) {
    case 'initRoutes': {
      self.__routes = JSON.parse(payload.routes, (key, value) => {
        return (
          typeof value === 'string' &&
          value.indexOf('__FUNC__') === 0
        )
          ? eval(`(${value.replace('__FUNC__', '')})`)
          : value
      })
    }
  }
})

/**
 * Matches the given route against the mask and returns the result
 * whether the route matches the mask, and which url parameters it contains.
 * @param {string} mask A mask to match against the given route.
 * @param {string} route
 */
function parseRoute(mask, route) {
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
      return Object.assign(acc, { [paramName]: paramValue })
    }, {})

  return {
    url: route,
    matches: !!match,
    params,
  }
}

const createRes = () => ({
  headers: new Headers(),
  body: null,
  statusCode: 200,
  statusText: 'OK',
  json(body) {
    this.body = JSON.stringify(body)
    return this
  },
  status(statusCode, statusText) {
    this.statusCode = statusCode
    this.statusText = statusText
    return this
  }
})

self.addEventListener('fetch', function (event) {
  const routes = self.__routes
  if (!routes) {
    return
  }

  const req = event.request
  const relevantRoutes = routes[req.method.toLowerCase()] || {}

  Object.keys(relevantRoutes).forEach((routeUrl) => {
    const parsedRoute = parseRoute(routeUrl, req.url)

    if (parsedRoute.matches) {
      const res = createRes()
      const handler = relevantRoutes[routeUrl]

      handler(Object.assign(parsedRoute, req), res)
      const response = new Response(res.body, {
        headers: res.headers,
        status: res.statusCode,
        statusText: res.statusText,
      })

      return event.respondWith(response)
    }
  })
})

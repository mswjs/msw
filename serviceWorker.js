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

self.addEventListener('fetch', function (event) {
  const routes = self.__routes
  if (!routes) {
    return
  }

  const req = event.request
  const relevantRoutes = routes[req.method.toLowerCase()] || {}

  Object.keys(relevantRoutes).forEach((routeUrl) => {
    /** @todo Support complex syntax (i.e. with params) */
    const reqMatches = routeUrl === req.url

    if (reqMatches) {
      const handler = relevantRoutes[routeUrl]
      const res = new Response(JSON.stringify(handler(req)))
      return event.respondWith(res)
    }
  })
})

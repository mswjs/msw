/**
 * Mock Service Worker.
 * @see https://github.com/kettanaito/msw
 * This Service Worker is meant for development usage only.
 * Make sure not to include it on production.
 */
self.addEventListener('install', (event) => {
  return self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  console.log('%c[MSW] Activated!', 'color:green;font-weight:bold;')
  return self.clients.claim()
})

self.addEventListener('message', (event) => {
  switch (event.data) {
    case 'MOCK_ACTIVATE': {
      self.__isMswEnabled = true
      break
    }

    case 'MOCK_DEACTIVATE': {
      self.__isMswEnabled = false
      break
    }
  }
})

const messageClient = (client, message) => {
  return new Promise((resolve, reject) => {
    const channel = new MessageChannel()

    channel.port1.onmessage = (event) => {
      if (event.data && event.data.error) {
        reject(event.data.error)
      } else {
        resolve(event.data)
      }
    }

    client.postMessage(JSON.stringify(message), [channel.port2])
  })
}

self.addEventListener('fetch', async (event) => {
  const { clientId, request: req } = event
  const requestClone = req.clone()
  const getOriginalResponse = () => fetch(requestClone)

  event.respondWith(
    new Promise(async (resolve) => {
      const client = await event.target.clients.get(clientId)

      // Bypass requests while MSW is not enabled
      if (!client || !self.__isMswEnabled) {
        return resolve(getOriginalResponse())
      }

      // Bypass requests with the explicit bypass header
      if (req.headers.get('x-msw-bypass') === 'true') {
        const modifiedHeaders = serializeHeaders(req.headers)
        // Remove the bypass header to comply with the CORS preflight check
        delete modifiedHeaders['x-msw-bypass']

        return resolve(
          fetch(
            new Request(req.url, {
              ...req,
              headers: new Headers(modifiedHeaders),
            }),
          ),
        )
      }

      /**
       * Converts "Headers" to the plain Object to be stringified.
       * @todo See how this handles multipe headers with the same name.
       */
      const reqHeaders = serializeHeaders(req.headers)

      /**
       * If the body cannot be resolved (either as JSON or to text/string),
       * the default value will be undefined.
       */
      const json = await req.json().catch(() => void 0)
      const text = await req.text().catch(() => void 0)

      const clientResponse = await messageClient(client, {
        url: req.url,
        method: req.method,
        headers: reqHeaders,
        cache: req.cache,
        mode: req.mode,
        credentials: req.credentials,
        destination: req.destination,
        integrity: req.integrity,
        redirect: req.redirect,
        referrer: req.referrer,
        referrerPolicy: req.referrerPolicy,
        body: json || text,
        bodyUsed: req.bodyUsed,
        keepalive: req.keepalive,
      })

      if (clientResponse === 'MOCK_NOT_FOUND') {
        return resolve(getOriginalResponse())
      }

      const mockedResponse = JSON.parse(clientResponse, (key, value) => {
        return key === 'headers' ? new Headers(value) : value
      })

      setTimeout(
        resolve.bind(this, new Response(mockedResponse.body, mockedResponse)),
        mockedResponse.delay,
      )
    }).catch((error) => {
      console.error(
        '[MSW] Failed to mock a "%s" request to "%s": %s',
        req.method,
        req.url,
        error,
      )
    }),
  )
})

const serializeHeaders = (headers) => {
  const reqHeaders = {}
  headers.forEach((value, name) => {
    reqHeaders[name] = value
  })
  return reqHeaders
}

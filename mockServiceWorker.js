/**
 * Mock Service Worker.
 * @see https://github.com/open-draft/msw
 * This Service Worker is meant for development usage only.
 * Please make sure not to include it on production.
 */
self.addEventListener('install', () => {
  return self.skipWaiting()
})

self.addEventListener('activate', () => {
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
  const { clientId, request } = event
  const withOriginalResponse = () => fetch(request)

  event.respondWith(
    new Promise(async (resolve) => {
      const client = await event.target.clients.get(clientId)

      // Bypass mocking when no client registered,
      // or when MSW is disabled (i.e. initial page load).
      if (!client || !self.__isMswEnabled) {
        return resolve(withOriginalResponse())
      }

      /**
       * Converts "Headers" to the plain Object to be stringified.
       * @todo See how this handles multipe headers with the same name.
       */
      const requestHeaders = {}
      request.headers.forEach((value, name) => {
        requestHeaders[name] = value
      })

      // If the body cannot be resolved (either as JSON or to text/string),
      // the default value will be undefined.
      const requestBody = await request
        .json()
        .catch(() => request.text())
        .catch(() => void 0)

      const clientResponse = await messageClient(client, {
        url: request.url,
        method: request.method,
        headers: requestHeaders,
        cache: request.cache,
        mode: request.mode,
        credentials: request.credentials,
        redirect: request.redirect,
        referrer: request.referrer,
        referrerPolicy: request.referrerPolicy,
        body: requestBody,
      })

      if (clientResponse === 'MOCK_NOT_FOUND') {
        return resolve(withOriginalResponse())
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
        '[MSW] Failed to mock (%s) "%s":\n%o',
        request.method,
        request.url,
        error,
      )
    }),
  )
})

self.addEventListener('install', (event) => {
  return self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  console.log(
    '%c[MSW] Service Worker is activated!',
    'color:green;font-weight:bold;',
  )
  return self.clients.claim()
})

self.addEventListener('message', (event) => {
  switch (event.data) {
    case 'MOCK_ACTIVATE': {
      self.__shouldMockResponses = true
      break
    }

    case 'MOCK_DEACTIVATE': {
      self.__shouldMockResponses = false
      break
    }
  }
})

const sendMessageToClient = (client, message) => {
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

  /**
   * Original response getter for the requests that
   * do not match any mocking routes. Performs no
   * data fetching prior to being called.
   */
  const getOriginalResponse = () => fetch(req)

  event.respondWith(
    new Promise(async (resolve, reject) => {
      const client = await event.target.clients.get(clientId)

      if (!client || !self.__shouldMockResponses) {
        return resolve(getOriginalResponse())
      }

      /**
       * Converts "Headres" to the plain Object to be stringified.
       * @todo See how this handles multipe headers with the same name.
       */
      const reqHeaders = {}
      req.headers.forEach((value, name) => {
        reqHeaders[name] = value
      })

      const clientResponse = await sendMessageToClient(client, {
        url: req.url,
        method: req.method,
        headers: reqHeaders,
        cache: req.cache,
        mode: req.mode,
        credentials: req.credentials,
        redirect: req.redirect,
        referrer: req.referrer,
        referrerPolicy: req.referrerPolicy,
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

self.__clientPresent = false

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting())
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
  console.log('%cMockServiceWorker is activated!', 'color:green;font-weight:bold;')
})

self.addEventListener('message', (event) => {
  switch (event.data) {
    case 'mock-activate': {
      self.__mockActive = true
      break;
    }

    case 'mock-deactivate': {
      self.__mockActive = false
      break;
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

  const defaultResponse = () => {
    return fetch(req)
  }

  return event.respondWith(new Promise(async (resolve, reject) => {
    const client = await event.target.clients.get(clientId)
    if (!client || !self.__mockActive) {
      return resolve(defaultResponse())
    }

    const clientResponse = await sendMessageToClient(client, {
      url: req.url,
      method: req.method
    })

    if (clientResponse === 'not-found') {
      return resolve(defaultResponse())
    }

    const res = JSON.parse(clientResponse)
    const { body, timeout } = res
  
    const mockedResponse = new Response(body, {
      headers: res.headers,
      status: res.statusCode,
      statusText: res.statusText,
    })

    setTimeout(resolve.bind(this, mockedResponse), timeout)
  }).catch(console.error))
})

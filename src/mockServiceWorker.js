/**
 * Mock Service Worker.
 * @see https://github.com/open-draft/msw
 * - Please do NOT modify this file.
 * - Please do NOT serve this file on production.
 */
/* eslint-disable */
/* tslint:disable */

const INTEGRITY_CHECKSUM = '<INTEGRITY_CHECKSUM>'
const bypassHeaderName = 'x-msw-bypass'

self.addEventListener('install', function () {
  return self.skipWaiting()
})

self.addEventListener('activate', function () {
  return self.clients.claim()
})

self.addEventListener('message', async function (event) {
  const clientId = event.source.id
  const client = await event.currentTarget.clients.get(clientId)

  switch (event.data) {
    case 'INTEGRITY_CHECK_REQUEST': {
      sendToClient(client, {
        type: 'INTEGRITY_CHECK_RESPONSE',
        payload: INTEGRITY_CHECKSUM,
      })
      break
    }

    case 'MOCK_ACTIVATE': {
      self.__isMswEnabled = true
      sendToClient(client, {
        type: 'MOCKING_ENABLED',
        payload: true,
      })
      break
    }

    case 'MOCK_DEACTIVATE': {
      self.__isMswEnabled = false
      console.warn('[MSW] Deactivating Service Worker...')
      break
    }
  }
})

self.addEventListener('fetch', async function (event) {
  const { clientId, request } = event
  const requestClone = request.clone()
  const getOriginalResponse = () => fetch(requestClone)

  event.respondWith(
    new Promise(async (resolve) => {
      // Always bypass navigation requests
      if (request.mode === 'navigate') {
        self.__isMswEnabled = false
        return resolve(getOriginalResponse())
      }

      const client = await event.target.clients.get(clientId)

      // Bypass requests while MSW is not enabled
      if (!client || !self.__isMswEnabled) {
        return resolve(getOriginalResponse())
      }

      // Bypass requests with the explicit bypass header
      if (requestClone.headers.get(bypassHeaderName) === 'true') {
        const modifiedHeaders = serializeHeaders(requestClone.headers)
        // Remove the bypass header to comply with the CORS preflight check
        delete modifiedHeaders[bypassHeaderName]

        const originalRequest = new Request(requestClone, {
          headers: new Headers(modifiedHeaders),
        })

        return resolve(fetch(originalRequest))
      }

      const reqHeaders = serializeHeaders(request.headers)
      const body = await request
        .json()
        .catch(() => request.text())
        .catch(() => null)

      const rawClientMessage = await sendToClient(client, {
        type: 'REQUEST',
        payload: {
          url: request.url,
          method: request.method,
          headers: reqHeaders,
          cache: request.cache,
          mode: request.mode,
          credentials: request.credentials,
          destination: request.destination,
          integrity: request.integrity,
          redirect: request.redirect,
          referrer: request.referrer,
          referrerPolicy: request.referrerPolicy,
          body,
          bodyUsed: request.bodyUsed,
          keepalive: request.keepalive,
        },
      })

      const clientMessage = JSON.parse(rawClientMessage)

      if (clientMessage.type === 'MOCK_NOT_FOUND') {
        return resolve(getOriginalResponse())
      }

      if (clientMessage.type === 'INTERNAL_ERROR') {
        const parsedBody = JSON.parse(clientMessage.payload.body)

        console.error(
          `\
[MSW] Request handler function for "%s %s" has thrown the following exception:

${parsedBody.errorType}: ${parsedBody.message}
(see more detailed error stack trace in the mocked response body)

This exception has been gracefully handled as a 500 response, however, it's strongly recommended to resolve this error.
If you wish to mock an error response, please refer to this guide: https://redd.gitbook.io/msw/recipes/mocking-error-responses\
  `,
          request.method,
          request.url,
        )

        return resolve(createResponse(clientMessage))
      }

      if (clientMessage.type === 'MOCK_SUCCESS') {
        setTimeout(
          resolve.bind(this, createResponse(clientMessage)),
          clientMessage.delay,
        )
      }
    }).catch((error) => {
      console.error(
        '[MSW] Failed to mock a "%s" request to "%s": %s',
        request.method,
        request.url,
        error,
      )
    }),
  )
})

function serializeHeaders(headers) {
  const reqHeaders = {}
  headers.forEach((value, name) => {
    reqHeaders[name] = value
  })
  return reqHeaders
}

function sendToClient(client, message) {
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

function createResponse(clientMessage) {
  return new Response(clientMessage.payload.body, {
    ...clientMessage.payload,
    headers: clientMessage.payload.headers,
  })
}

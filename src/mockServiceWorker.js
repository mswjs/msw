/* eslint-disable */
/* tslint:disable */

/**
 * Mock Service Worker.
 * @see https://github.com/mswjs/msw
 * - Please do NOT modify this file.
 */

const PACKAGE_VERSION = '<PACKAGE_VERSION>'
const INTEGRITY_CHECKSUM = '<INTEGRITY_CHECKSUM>'
const IS_MOCKED_RESPONSE = Symbol('isMockedResponse')

const activeClientIds = new Set()
/**
 * @type {Map<string, Set<Promise<Response>>>}
 */
const pendingRequests = new Map()

addEventListener('install', function () {
  self.skipWaiting()
})

addEventListener('activate', function (event) {
  event.waitUntil(self.clients.claim())
})

addEventListener('message', function (event) {
  const clientId = Reflect.get(event.source || {}, 'id')

  if (!clientId || !self.clients) {
    return
  }

  event.waitUntil(
    (async () => {
      if (event.data === 'CLIENT_CLOSE') {
        const allClients = await self.clients.matchAll({
          type: 'window',
        })

        activeClientIds.delete(clientId)

        // Await any pending requests from the closing client.
        // This makes sure that those requests are handled and not passthrough.
        const pending = pendingRequests.get(clientId)
        if (pending != null && pending.size > 0) {
          await Promise.allSettled(pending)
        }
        pendingRequests.delete(clientId)

        const remainingClients = allClients.filter((client) => {
          return client.id !== clientId
        })

        // Unregister itself when there are no more clients
        if (remainingClients.length === 0) {
          await self.registration.unregister()
        }

        const client = await self.clients.get(clientId)

        if (client != null) {
          await sendToClient(client, {
            type: 'CLIENT_CLOSED',
          })
        }

        return
      }

      /**
       * @note Check for the client AFTER handling "CLIENT_CLOSE".
       * This prevents early return on "!client" in case the page has reloaded
       * and disassociated itself from the worker. This ensures self-unregistration
       * still fires for those pages.
       */
      const client = await self.clients.get(clientId)

      if (!client) {
        return
      }

      switch (event.data) {
        case 'KEEPALIVE_REQUEST': {
          await sendToClient(client, {
            type: 'KEEPALIVE_RESPONSE',
          })
          break
        }

        case 'INTEGRITY_CHECK_REQUEST': {
          await sendToClient(client, {
            type: 'INTEGRITY_CHECK_RESPONSE',
            payload: {
              packageVersion: PACKAGE_VERSION,
              checksum: INTEGRITY_CHECKSUM,
            },
          })
          break
        }

        case 'MOCK_ACTIVATE': {
          activeClientIds.add(clientId)

          await sendToClient(client, {
            type: 'MOCKING_ENABLED',
            payload: {
              client: {
                id: client.id,
                frameType: client.frameType,
              },
            },
          })
          break
        }
      }
    })(),
  )
})

addEventListener('fetch', function (event) {
  // Opening the DevTools triggers the "only-if-cached" request
  // that cannot be handled by the worker. Bypass such requests.
  if (
    event.request.cache === 'only-if-cached' &&
    event.request.mode !== 'same-origin'
  ) {
    return
  }

  // Bypass all requests when there are no active clients.
  // Prevents the self-unregistered worked from handling requests
  // after it's been terminated (still remains active until the next reload).
  if (activeClientIds.size === 0) {
    return
  }

  const requestId = crypto.randomUUID()
  event.respondWith(handleRequest(event, requestId))
})

/**
 * @param {FetchEvent} event
 * @param {string} requestId
 */
async function handleRequest(event, requestId) {
  const client = await resolveMainClient(event)
  const requestCloneForEvents = event.request.clone()

  const responsePromise = getResponse(event, client, requestId)

  if (client != null) {
    let pending = pendingRequests.get(client.id)

    if (pending == null) {
      pendingRequests.set(client.id, (pending = new Set()))
    }

    pending.add(responsePromise)
    responsePromise
      .finally(() => pending.delete(responsePromise))
      .catch(() => {})
  }

  const response = await responsePromise

  // Send back the response clone for the "response:*" life-cycle events.
  // Ensure MSW is active and ready to handle the message, otherwise
  // this message will pend indefinitely.
  if (client && activeClientIds.has(client.id)) {
    const serializedRequest = await serializeRequest(requestCloneForEvents)

    // Omit the body of server-sent event stream responses.
    // Cloning such responses would prevent client-side stream cancelations
    // from reaching the original stream (a teed stream only cancels its
    // source once both of its branches cancel) and would buffer the
    // entire stream into the unconsumed clone indefinitely.
    const isEventStreamResponse = response.headers
      .get('content-type')
      ?.toLowerCase()
      .startsWith('text/event-stream')

    // Clone the response so both the client and the library could consume it.
    const responseClone = isEventStreamResponse ? null : response.clone()

    sendToClient(
      client,
      {
        type: 'RESPONSE',
        payload: {
          isMockedResponse: IS_MOCKED_RESPONSE in response,
          request: {
            id: requestId,
            ...serializedRequest,
          },
          response: {
            type: response.type,
            status: response.status,
            statusText: response.statusText,
            headers: Object.fromEntries(response.headers.entries()),
            body: responseClone ? responseClone.body : null,
          },
        },
      },
      responseClone && responseClone.body
        ? [serializedRequest.body, responseClone.body]
        : [],
    )
  }

  return response
}

/**
 * Resolve the main client for the given event.
 * Client that issues a request doesn't necessarily equal the client
 * that registered the worker. It's with the latter the worker should
 * communicate with during the response resolving phase.
 * @param {FetchEvent} event
 * @returns {Promise<Client | undefined>}
 */
async function resolveMainClient(event) {
  const client = await self.clients.get(event.clientId)

  if (activeClientIds.has(event.clientId)) {
    return client
  }

  if (client?.frameType === 'top-level') {
    return client
  }

  const allClients = await self.clients.matchAll({
    type: 'window',
  })

  return allClients
    .filter((client) => {
      // Get only those clients that are currently visible.
      return client.visibilityState === 'visible'
    })
    .find((client) => {
      // Find the client ID that's recorded in the
      // set of clients that have registered the worker.
      return activeClientIds.has(client.id)
    })
}

/**
 * @param {FetchEvent} event
 * @param {Client | undefined} client
 * @param {string} requestId
 * @returns {Promise<Response>}
 */
async function getResponse(event, client, requestId) {
  // Clone the request because it might've been already used
  // (i.e. its body has been read and sent to the client).
  const requestClone = event.request.clone()

  function passthrough() {
    // Cast the request headers to a new Headers instance
    // so the headers can be manipulated with.
    const headers = new Headers(requestClone.headers)

    // Remove the "accept" header value that marked this request as passthrough.
    // This prevents request alteration and also keeps it compliant with the
    // user-defined CORS policies.
    const acceptHeader = headers.get('accept')
    if (acceptHeader) {
      const values = acceptHeader.split(',').map((value) => value.trim())
      const filteredValues = values.filter(
        (value) => value !== 'msw/passthrough',
      )

      if (filteredValues.length > 0) {
        headers.set('accept', filteredValues.join(', '))
      } else {
        headers.delete('accept')
      }
    }

    return fetch(requestClone, { headers })
  }

  // Bypass mocking when the client is not active.
  if (!client) {
    return passthrough()
  }

  // Bypass initial page load requests (i.e. static assets).
  // The absence of the immediate/parent client in the map of the active clients
  // means that MSW hasn't dispatched the "MOCK_ACTIVATE" event yet
  // and is not ready to handle requests.
  if (!activeClientIds.has(client.id)) {
    return passthrough()
  }

  // Notify the client that a request has been intercepted.
  const serializedRequest = await serializeRequest(event.request)
  const clientMessage = await sendToClient(
    client,
    {
      type: 'REQUEST',
      payload: {
        id: requestId,
        ...serializedRequest,
      },
    },
    [serializedRequest.body],
  )

  switch (clientMessage.type) {
    case 'MOCK_RESPONSE': {
      return respondWithMock(clientMessage.data, event)
    }

    case 'PASSTHROUGH': {
      return passthrough()
    }
  }

  return passthrough()
}

/**
 * @param {Client} client
 * @param {any} message
 * @param {Array<Transferable>} transferrables
 * @returns {Promise<any>}
 */
function sendToClient(client, message, transferrables = []) {
  return new Promise((resolve, reject) => {
    const channel = new MessageChannel()

    channel.port1.onmessage = (event) => {
      if (event.data && event.data.error) {
        return reject(event.data.error)
      }

      resolve(event.data)
    }

    client.postMessage(message, [
      channel.port2,
      ...transferrables.filter(Boolean),
    ])
  })
}

/**
 * @param {Response} response
 * @param {FetchEvent} event
 * @returns {Promise<Response>}
 */
async function respondWithMock(response, event) {
  // Setting response status code to 0 is a no-op.
  // However, when responding with a "Response.error()", the produced Response
  // instance will have status code set to 0. Since it's not possible to create
  // a Response instance with status code 0, handle that use-case separately.
  if (response.status === 0) {
    return Response.error()
  }

  let body = response.body

  // Buffer the streamed mocked response body for navigation requests.
  // The stream is transferred from the client that is being navigated
  // away from. Once the navigation commits, that client gets destroyed
  // and the stream will never complete, resulting in an empty document.
  // Buffering here keeps "event.respondWith()" pending (the navigation
  // cannot commit) until the entire body arrives from the client.
  if (event.request.mode === 'navigate' && body instanceof ReadableStream) {
    body = await new Response(body).arrayBuffer()
  }

  const mockedResponse = new Response(body, response)

  Reflect.defineProperty(mockedResponse, IS_MOCKED_RESPONSE, {
    value: true,
    enumerable: true,
  })

  return mockedResponse
}

/**
 * @param {Request} request
 */
async function serializeRequest(request) {
  return {
    url: request.url,
    mode: request.mode,
    method: request.method,
    headers: Object.fromEntries(request.headers.entries()),
    cache: request.cache,
    credentials: request.credentials,
    destination: request.destination,
    integrity: request.integrity,
    redirect: request.redirect,
    referrer: request.referrer,
    referrerPolicy: request.referrerPolicy,
    body: await request.arrayBuffer(),
    keepalive: request.keepalive,
  }
}

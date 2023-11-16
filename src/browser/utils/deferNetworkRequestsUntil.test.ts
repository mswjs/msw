/**
 * @vitest-environment jsdom
 */
import { HttpServer } from '@open-draft/test-server/http'
import { deferNetworkRequestsUntil } from './deferNetworkRequestsUntil'

const httpServer = new HttpServer((app) => {
  app.get('/resource', (req, res) => {
    res.send('hello world')
  })
})

beforeAll(async () => {
  await httpServer.listen()
})

afterAll(async () => {
  await httpServer.close()
})

describe.sequential(deferNetworkRequestsUntil, () => {
  test('defers fetch requests until the predicate promise resolves', async () => {
    const events: Array<string> = []

    // Emulate a Service Worker registration Promise.
    const workerPromise = new Promise<null>((resolve) => {
      setTimeout(resolve, 500)
    })

    workerPromise.then(() => {
      events.push('promise resolved')
    })

    // Calling this functions intercepts all requests that happen while
    // the given promise is pending, and defers their execution
    // until the promise is resolved.
    deferNetworkRequestsUntil(workerPromise)

    // Perform a request.
    const responsePromise = fetch(httpServer.http.url('/resource')).then(
      (response) => {
        events.push('response received')
        return response.text()
      },
    )

    await Promise.all([workerPromise, responsePromise])
    expect(events).toEqual(['promise resolved', 'response received'])

    await expect(responsePromise).resolves.toBe('hello world')

    // Assert the order of resolved events.
    expect(window.fetch.name).toBe('fetch')
    expect(window.XMLHttpRequest.prototype.send.name).toBe('send')
  })

  test('defers XHR requests until the predicate promise resolves', async () => {
    const events: Array<string> = []

    // Emulate a Service Worker registration Promise.
    const workerPromise = new Promise<null>((resolve) => {
      setTimeout(resolve, 500)
    })

    workerPromise.then(() => {
      events.push('promise resolved')
    })

    // Calling this functions intercepts all requests that happen while
    // the given promise is pending, and defers their execution
    // until the promise is resolved.
    deferNetworkRequestsUntil(workerPromise)

    // Perform a request.
    const xhr = new XMLHttpRequest()
    xhr.open('GET', httpServer.http.url('/resource'))
    const responsePromise = new Promise<void>((resolve, reject) => {
      xhr.onload = () => {
        events.push('response received')
        resolve()
      }
      xhr.onerror = reject
      xhr.send()
    })

    await Promise.all([workerPromise, responsePromise])
    expect(events).toEqual(['promise resolved', 'response received'])

    expect(xhr.responseText).toBe('hello world')

    // Assert the order of resolved events.
    expect(window.fetch.name).toBe('fetch')
    expect(window.XMLHttpRequest.prototype.send.name).toBe('send')
  })

  test('restores module patches if no requests were made and the predicate promise resolves', async () => {
    const predicatePromise = new Promise((resolve) => {
      setTimeout(resolve, 500)
    })

    deferNetworkRequestsUntil(predicatePromise)
    await predicatePromise

    // Assert the module names to be restored.
    expect(window.fetch.name).toBe('fetch')
    expect(window.XMLHttpRequest.prototype.send.name).toBe('send')
  })

  test('restores fetch if the request is pending and the predicate promise rejects', async () => {
    const predicatePromise = new Promise((_, reject) => {
      // Intentionally reject the perdicate promise.
      reject(new Error('Failed to register a Service Worker'))
    }).catch(() => void 0)

    deferNetworkRequestsUntil(predicatePromise)

    // Perform a request.
    const responsePromise = fetch(httpServer.http.url('/resource')).then(
      (response) => response.text(),
    )

    await expect(responsePromise).resolves.toBe('hello world')

    // Assert the module names to be restored.
    expect(window.fetch.name).toBe('fetch')
    expect(window.XMLHttpRequest.prototype.send.name).toBe('send')
  })

  test('restores XMLHttpRequest if the request is pending and the predicate promise rejects', async () => {
    const predicatePromise = new Promise((_, reject) => {
      // Intentionally reject the perdicate promise.
      reject(new Error('Failed to register a Service Worker'))
    }).catch(() => void 0)

    deferNetworkRequestsUntil(predicatePromise)

    // Perform a request.
    const xhr = new XMLHttpRequest()
    const responsePromies = new Promise((resolve, reject) => {
      xhr.onload = () => resolve(xhr.responseText)
      xhr.onerror = reject
      xhr.open('GET', httpServer.http.url('/resource'))
      xhr.send()
    })

    await responsePromies
    expect(xhr.responseText).toBe('hello world')

    // Assert the module names to be restored.
    expect(window.fetch.name).toBe('fetch')
    expect(window.XMLHttpRequest.prototype.send.name).toBe('send')
  })

  test('restores module patches if no requests were made and the predicate promise rejects', async () => {
    const predicatePromise = new Promise((_, reject) => {
      // Intentionally reject the perdicate promise.
      reject(new Error('Failed to register a Service Worker'))
    }).catch(() => void 0)

    deferNetworkRequestsUntil(predicatePromise)
    await predicatePromise

    // Assert the module names to be restored.
    expect(window.fetch.name).toBe('fetch')
    expect(window.XMLHttpRequest.prototype.send.name).toBe('send')
  })
})

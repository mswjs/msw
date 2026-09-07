import type { LifeCycleEventsMap } from 'msw'
import { bypass, HttpResponse, http, passthrough } from 'msw'
import type { Network } from '../../../setup/network'
import {
  defineNetwork,
  expect,
  type ConsoleMessages,
} from '../../../setup/vitest-helpers'

const handlers = [
  http.get('*/user', () => {
    return HttpResponse.text('response-body', { status: 400 })
  }),
  http.post('*/no-response', () => {
    return
  }),
  http.get('*/passthrough', () => {
    return passthrough()
  }),
  http.get('*/bypass', async ({ request }) => {
    return fetch(bypass(request, { method: 'POST' }))
  }),
  http.get('*/unhandled-exception', () => {
    throw new Error('Unhandled resolver error')
  }),
]

const requestStartListener: (
  ...args: LifeCycleEventsMap['request:start']
) => void = ({ request, requestId }) => {
  console.warn(`[request:start] ${request.method} ${request.url} ${requestId}`)
}
const requestMatchListener: (
  ...args: LifeCycleEventsMap['request:match']
) => void = ({ request, requestId }) => {
  console.warn(`[request:match] ${request.method} ${request.url} ${requestId}`)
}
const requestUnhandledListener: (
  ...args: LifeCycleEventsMap['request:unhandled']
) => void = ({ request, requestId }) => {
  console.warn(
    `[request:unhandled] ${request.method} ${request.url} ${requestId}`,
  )
}
const requestEndListener: (
  ...args: LifeCycleEventsMap['request:end']
) => void = ({ request, requestId }) => {
  console.warn(`[request:end] ${request.method} ${request.url} ${requestId}`)
}
const responseMockedListener: (
  ...args: LifeCycleEventsMap['response:mocked']
) => void = async ({ response, request, requestId }) => {
  const body = await response.clone().text()
  const responseUrl = response.url || request.url
  console.warn(
    `[response:mocked] ${response.status} ${responseUrl} ${body} ${request.method} ${request.url} ${requestId}`,
  )
}
const responseBypassListener: (
  ...args: LifeCycleEventsMap['response:bypass']
) => void = async ({ response, request, requestId }) => {
  const body = await response.clone().text()
  const responseUrl = response.url || request.url
  console.warn(
    `[response:bypass] ${response.status} ${responseUrl} ${body} ${request.method} ${request.url} ${requestId}`,
  )
}
const unhandledExceptionListener: (
  ...args: LifeCycleEventsMap['unhandledException']
) => void = ({ error, request, requestId }) => {
  console.warn(
    `[unhandledException] ${request.method} ${request.url} ${requestId} ${error.message}`,
  )
}

function addNetworkListeners(network: Network): () => void {
  network.events.on('request:start', requestStartListener)
  network.events.on('request:match', requestMatchListener)
  network.events.on('request:unhandled', requestUnhandledListener)
  network.events.on('request:end', requestEndListener)
  network.events.on('response:mocked', responseMockedListener)
  network.events.on('response:bypass', responseBypassListener)
  network.events.on('unhandledException', unhandledExceptionListener)

  return () => {
    network.events.removeListener('request:start', requestStartListener)
    network.events.removeListener('request:match', requestMatchListener)
    network.events.removeListener('request:unhandled', requestUnhandledListener)
    network.events.removeListener('request:end', requestEndListener)
    network.events.removeListener('response:mocked', responseMockedListener)
    network.events.removeListener('response:bypass', responseBypassListener)
    network.events.removeListener(
      'unhandledException',
      unhandledExceptionListener,
    )
  }
}

function getRequestId(messages: ConsoleMessages) {
  const requestStartMessage = messages.get('warning')?.find((message) => {
    return message.startsWith('[request:start]')
  })
  return requestStartMessage?.split(' ')?.[3]
}

const test = defineNetwork({ handlers })

test.beforeEach(({ network }) => {
  return addNetworkListeners(network)
})

test('emits events for a handled request and mocked response', async ({
  spyOnConsole,
  fetch,
  testServer,
}) => {
  const consoleSpy = spyOnConsole()
  const url = testServer.http.url('/events/user')
  await fetch(url)
  const requestId = getRequestId(consoleSpy)

  await expect
    .poll(() => consoleSpy.get('warning'))
    .toContainEqual(expect.stringContaining('[response:mocked]'))

  expect(consoleSpy.get('warning')).toEqual([
    `[request:start] GET ${url} ${requestId}`,
    `[request:match] GET ${url} ${requestId}`,
    `[request:end] GET ${url} ${requestId}`,
    `[response:mocked] 400 ${url} response-body GET ${url} ${requestId}`,
  ])
})

test('emits events for a handled request with no response', async ({
  spyOnConsole,
  fetch,
  testServer,
}) => {
  const consoleSpy = spyOnConsole()
  const url = testServer.http.url('/events/no-response')
  await fetch(url, { method: 'POST' })
  const requestId = getRequestId(consoleSpy)

  await expect
    .poll(() => consoleSpy.get('warning'))
    .toContainEqual(expect.stringContaining('[response:bypass]'))

  expect(consoleSpy.get('warning')).toEqual([
    `[request:start] POST ${url} ${requestId}`,
    `[request:match] POST ${url} ${requestId}`,
    `[request:end] POST ${url} ${requestId}`,
    `[response:bypass] 200 ${url} original-response POST ${url} ${requestId}`,
  ])
})

test('emits events for an unhandled request', async ({
  spyOnConsole,
  fetch,
  testServer,
}) => {
  const consoleSpy = spyOnConsole()
  const url = testServer.http.url('/events/unknown-route')
  await fetch(url)
  const requestId = getRequestId(consoleSpy)

  await expect
    .poll(() => consoleSpy.get('warning'))
    .toContainEqual(expect.stringContaining('[response:bypass]'))

  expect(consoleSpy.get('warning')).toEqual([
    `[request:start] GET ${url} ${requestId}`,
    `[request:unhandled] GET ${url} ${requestId}`,
    `[request:end] GET ${url} ${requestId}`,
    `[response:bypass] 404 ${url} majestic-unknown GET ${url} ${requestId}`,
  ])
})

test('emits events for a passthrough request', async ({
  spyOnConsole,
  fetch,
  testServer,
}) => {
  const consoleSpy = spyOnConsole()
  const url = testServer.http.url('/events/passthrough')
  await fetch(url)
  const requestId = getRequestId(consoleSpy)

  await expect
    .poll(() => consoleSpy.get('warning'))
    .toEqual([
      `[request:start] GET ${url} ${requestId}`,
      `[request:match] GET ${url} ${requestId}`,
      `[request:end] GET ${url} ${requestId}`,
      `[response:bypass] 200 ${url} passthrough-response GET ${url} ${requestId}`,
    ])
})

test('emits events for a bypassed request', async ({
  spyOnConsole,
  fetch,
  page,
  testServer,
}) => {
  const consoleSpy = spyOnConsole()
  const pageErrors: Array<Error> = []
  page.on('pageerror', (error) => pageErrors.push(error))

  const url = testServer.http.url('/events/bypass')
  await fetch(url)

  await expect
    .poll(() => consoleSpy.get('warning'))
    .toEqual(
      expect.arrayContaining([
        expect.stringContaining(`[request:start] GET ${url}`),
        expect.stringContaining(`[request:end] GET ${url}`),
        expect.stringContaining(
          `[response:mocked] 200 ${url} bypassed-response GET ${url}`,
        ),
      ]),
    )

  expect(consoleSpy.get('warning')).toEqual(
    expect.arrayContaining([
      expect.stringContaining(`[request:start] POST ${url}`),
      expect.stringContaining(`[request:end] POST ${url}`),
      expect.stringContaining(
        `[response:bypass] 200 ${url} bypassed-response POST ${url}`,
      ),
    ]),
  )
  expect(pageErrors).toEqual([])
})

test('emits unhandled exceptions in the request handler', async ({
  spyOnConsole,
  fetch,
  testServer,
}) => {
  const consoleSpy = spyOnConsole()
  const url = testServer.http.url('/events/unhandled-exception')
  await fetch(url)
  const requestId = getRequestId(consoleSpy)

  expect(consoleSpy.get('warning')).toContain(
    `[unhandledException] GET ${url} ${requestId} Unhandled resolver error`,
  )
})

test('removes a listener by the event name', async ({
  network,
  spyOnConsole,
  fetch,
  testServer,
}) => {
  const consoleSpy = spyOnConsole()
  network.events.removeListener('request:end', requestEndListener)

  await fetch(testServer.http.url('/events/user'))

  await expect
    .poll(() => consoleSpy.get('warning'))
    .toContainEqual(expect.stringContaining('[response:mocked]'))
  expect(consoleSpy.get('warning')).not.toContainEqual(
    expect.stringContaining('[request:end]'),
  )
})

test('removes all listeners attached to the network instance', async ({
  network,
  spyOnConsole,
  fetch,
  testServer,
}) => {
  const consoleSpy = spyOnConsole()
  const url = testServer.http.url('/events/user')
  await fetch(url)

  await expect
    .poll(() => consoleSpy.get('warning'))
    .toContainEqual(expect.stringContaining('[response:mocked]'))

  network.events.removeAllListeners()
  consoleSpy.clear()
  await fetch(url)

  await expect(
    expect
      .poll(() => consoleSpy.get('warning'), { timeout: 2000 })
      .toContainEqual(expect.stringContaining('[response:mocked]')),
  ).rejects.toThrow()
})

test('removes all listeners by the event name', async ({
  network,
  spyOnConsole,
  fetch,
  testServer,
}) => {
  const consoleSpy = spyOnConsole()
  const url = testServer.http.url('/events/user')
  await fetch(url)

  await expect
    .poll(() => consoleSpy.get('warning'))
    .toContainEqual(expect.stringContaining('[response:mocked]'))

  network.events.removeAllListeners('request:end')
  consoleSpy.clear()
  await fetch(url)

  await expect
    .poll(() => consoleSpy.get('warning'))
    .toContainEqual(expect.stringContaining('[response:mocked]'))
  expect(consoleSpy.get('warning')).not.toContainEqual(
    expect.stringContaining('[request:end]'),
  )
})

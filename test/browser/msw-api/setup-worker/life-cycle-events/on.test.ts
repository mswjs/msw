import type { SetupWorker } from 'msw/browser'
import { HttpServer } from '@open-draft/test-server/http'
import type { ConsoleMessages } from 'page-with'
import { test, expect } from '../../../playwright.extend'

declare namespace window {
  export const msw: {
    worker: SetupWorker
  }
}

const ON_EXAMPLE = require.resolve('./on.mocks.ts')

const server = new HttpServer((app) => {
  app.post('/no-response', (_req, res) => {
    res.send('original-response')
  })
  app.get('/unknown-route', (_req, res) => {
    res.send('majestic-unknown')
  })
  app.get('/passthrough', (_req, res) => {
    res.send('passthrough-response')
  })
})

export function getRequestId(messages: ConsoleMessages) {
  const requestStartMessage = messages.get('warning')?.find((message) => {
    return message.startsWith('[request:start]')
  })
  return requestStartMessage?.split(' ')?.[3]
}

test.beforeAll(async () => {
  await server.listen()
})

test.afterAll(async () => {
  await server.close()
})

test('emits events for a handled request and mocked response', async ({
  loadExample,
  spyOnConsole,
  fetch,
  waitFor,
}) => {
  const consoleSpy = spyOnConsole()
  await loadExample(ON_EXAMPLE)

  const url = server.http.url('/user')
  await fetch(url)
  const requestId = getRequestId(consoleSpy)

  await waitFor(() => {
    expect(consoleSpy.get('warning')).toContainEqual(
      expect.stringContaining('[response:mocked]'),
    )
  })

  expect(consoleSpy.get('warning')).toEqual([
    `[request:start] GET ${url} ${requestId}`,
    `[request:match] GET ${url} ${requestId}`,
    `[request:end] GET ${url} ${requestId}`,
    `[response:mocked] ${url} response-body GET ${url} ${requestId}`,
  ])
})

test('emits events for a handled request with no response', async ({
  loadExample,
  spyOnConsole,
  fetch,
  waitFor,
}) => {
  const consoleSpy = spyOnConsole()
  await loadExample(ON_EXAMPLE)

  const url = server.http.url('/no-response')
  await fetch(url, { method: 'POST' })
  const requestId = getRequestId(consoleSpy)

  await waitFor(() => {
    expect(consoleSpy.get('warning')).toContainEqual(
      expect.stringContaining('[response:bypass]'),
    )
  })

  expect(consoleSpy.get('warning')).toEqual([
    `[request:start] POST ${url} ${requestId}`,
    `[request:end] POST ${url} ${requestId}`,
    `[response:bypass] ${url} original-response POST ${url} ${requestId}`,
  ])
})

test('emits events for an unhandled request', async ({
  loadExample,
  spyOnConsole,
  fetch,
  waitFor,
}) => {
  const consoleSpy = spyOnConsole()
  await loadExample(ON_EXAMPLE)

  const url = server.http.url('/unknown-route')
  await fetch(url)
  const requestId = getRequestId(consoleSpy)

  await waitFor(() => {
    expect(consoleSpy.get('warning')).toContainEqual(
      expect.stringContaining('[response:bypass]'),
    )
  })

  expect(consoleSpy.get('warning')).toEqual([
    `[request:start] GET ${url} ${requestId}`,
    `[request:unhandled] GET ${url} ${requestId}`,
    `[request:end] GET ${url} ${requestId}`,
    `[response:bypass] ${url} majestic-unknown GET ${url} ${requestId}`,
  ])
})

test('emits events for a passthrough request', async ({
  loadExample,
  spyOnConsole,
  fetch,
  waitFor,
}) => {
  const consoleSpy = spyOnConsole()
  await loadExample(ON_EXAMPLE)

  // Explicit "passthrough()" request must go through the
  // same request processing pipeline to contain both
  // "request" and "response" in the life-cycle event listener.
  const url = server.http.url('/passthrough')
  await fetch(url)
  const requestId = getRequestId(consoleSpy)

  await waitFor(() => {
    expect(consoleSpy.get('warning')).toEqual([
      `[request:start] GET ${url} ${requestId}`,
      `[request:end] GET ${url} ${requestId}`,
      `[response:bypass] ${url} passthrough-response GET ${url} ${requestId}`,
    ])
  })
})

test('emits unhandled exceptions in the request handler', async ({
  loadExample,
  spyOnConsole,
  fetch,
}) => {
  const consoleSpy = spyOnConsole()
  await loadExample(ON_EXAMPLE)

  const url = server.http.url('/unhandled-exception')
  await fetch(url)
  const requestId = getRequestId(consoleSpy)

  expect(consoleSpy.get('warning')).toContain(
    `[unhandledException] GET ${url} ${requestId} Unhandled resolver error`,
  )
})

test('stops emitting events once the worker is stopped', async ({
  loadExample,
  spyOnConsole,
  fetch,
  page,
}) => {
  const consoleSpy = spyOnConsole()
  await loadExample(ON_EXAMPLE)

  await page.evaluate(() => {
    return window.msw.worker.stop()
  })
  await fetch('/unknown-route')

  expect(consoleSpy.get('warning')).toBeUndefined()
})

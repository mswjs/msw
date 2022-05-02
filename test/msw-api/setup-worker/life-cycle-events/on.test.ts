import * as path from 'path'
import { SetupWorkerApi } from 'msw'
import { pageWith, ScenarioApi } from 'page-with'
import { waitFor } from '../../../support/waitFor'

declare namespace window {
  export const msw: {
    worker: SetupWorkerApi
  }
}

function createRuntime() {
  return pageWith({
    example: path.resolve(__dirname, 'on.mocks.ts'),
    routes(app) {
      app.post('/no-response', (req, res) => {
        res.send('original-response')
      })
      app.get('/unknown-route', (req, res) => {
        res.send('majestic-unknown')
      })
    },
  })
}

export function getRequestId(messages: ScenarioApi['consoleSpy']) {
  const requestStartMessage = messages.get('warning').find((message) => {
    return message.startsWith('[request:start]')
  })
  return requestStartMessage.split(' ')[3]
}

test('emits events for a handled request and mocked response', async () => {
  const runtime = await createRuntime()
  const url = runtime.makeUrl('/user')
  await runtime.request(url)
  const requestId = getRequestId(runtime.consoleSpy)

  await waitFor(() => {
    expect(runtime.consoleSpy.get('warning')).toContainEqual(
      expect.stringContaining('[response:mocked]'),
    )
  })

  expect(runtime.consoleSpy.get('warning')).toEqual([
    `[request:start] GET ${url} ${requestId}`,
    `[request:match] GET ${url} ${requestId}`,
    `[request:end] GET ${url} ${requestId}`,
    `[response:mocked] response-body ${requestId}`,
  ])
})

test('emits events for a handled request with no response', async () => {
  const runtime = await createRuntime()
  const url = runtime.makeUrl('/no-response')
  await runtime.request(url, { method: 'POST' })
  const requestId = getRequestId(runtime.consoleSpy)

  await waitFor(() => {
    expect(runtime.consoleSpy.get('warning')).toContainEqual(
      expect.stringContaining('[response:bypass]'),
    )
  })

  expect(runtime.consoleSpy.get('warning')).toEqual([
    `[request:start] POST ${url} ${requestId}`,
    expect.stringContaining(
      '[MSW] Expected response resolver to return a mocked response Object',
    ),
    `[request:end] POST ${url} ${requestId}`,
    `[response:bypass] original-response ${requestId}`,
  ])
})

test('emits events for an unhandled request', async () => {
  const runtime = await createRuntime()
  const url = runtime.makeUrl('/unknown-route')
  await runtime.request(url)
  const requestId = getRequestId(runtime.consoleSpy)

  await waitFor(() => {
    expect(runtime.consoleSpy.get('warning')).toContainEqual(
      expect.stringContaining('[response:bypass]'),
    )
  })

  expect(runtime.consoleSpy.get('warning')).toEqual([
    `[request:start] GET ${url} ${requestId}`,
    `[request:unhandled] GET ${url} ${requestId}`,
    `[request:end] GET ${url} ${requestId}`,
    `[response:bypass] majestic-unknown ${requestId}`,
  ])
})

test('emits unhandled exceptions in the request handler', async () => {
  const runtime = await createRuntime()
  const url = runtime.makeUrl('/unhandled-exception')
  await runtime.request(url)
  const requestId = getRequestId(runtime.consoleSpy)

  expect(runtime.consoleSpy.get('warning')).toContain(
    `[unhandledException] GET ${url} ${requestId} Unhandled resolver error`,
  )
})

test('stops emitting events once the worker is stopped', async () => {
  const runtime = await createRuntime()

  await runtime.page.evaluate(() => {
    return window.msw.worker.stop()
  })
  await runtime.request('/unknown-route')

  expect(runtime.consoleSpy.get('warning')).toBeUndefined()
})

import * as path from 'path'
import { SetupWorkerApi } from 'msw'
import { runBrowserWith } from '../../support/runBrowserWith'
import { captureConsole } from '../../support/captureConsole'
import { sleep } from '../../support/utils'

declare namespace window {
  export const worker: SetupWorkerApi
}

function createRuntime() {
  return runBrowserWith(path.resolve(__dirname, 'life-cycle-events.mocks.ts'))
}

function getRequestId(messages: ReturnType<typeof captureConsole>['messages']) {
  const requestStartMessage = messages.warning.find((message) => {
    return message.startsWith('[request:start]')
  })
  return requestStartMessage.split(' ')[3]
}

test('emits events for a handled request and mocked response', async () => {
  const runtime = await createRuntime()
  const { messages } = captureConsole(runtime.page)
  const endpointUrl = `${runtime.origin}/user`

  await runtime.request({
    url: endpointUrl,
  })
  await sleep(500)

  const requestId = getRequestId(messages)
  expect(messages.warning).toEqual([
    `[request:start] GET ${endpointUrl} ${requestId}`,
    `[request:match] GET ${endpointUrl} ${requestId}`,
    `[request:end] GET ${endpointUrl} ${requestId}`,
    `[response:mocked] response-body ${requestId}`,
  ])

  return runtime.cleanup()
})

test('emits events for a handled request with no response', async () => {
  const runtime = await createRuntime()
  const { messages } = captureConsole(runtime.page)
  const endpointUrl = `${runtime.origin}/no-response`

  await runtime.request({
    url: endpointUrl,
    fetchOptions: {
      method: 'POST',
    },
  })
  await sleep(500)

  const requestId = getRequestId(messages)
  expect(messages.warning).toEqual([
    `[request:start] POST ${endpointUrl} ${requestId}`,
    `[request:unhandled] POST ${endpointUrl} ${requestId}`,
    `[request:end] POST ${endpointUrl} ${requestId}`,
    `[response:bypass] ${requestId}`,
  ])

  return runtime.cleanup()
})

test('emits events for an unhandled request', async () => {
  const runtime = await createRuntime()
  const { messages } = captureConsole(runtime.page)
  const endpointUrl = `${runtime.origin}/unknown-route`

  await runtime.request({
    url: endpointUrl,
  })
  await sleep(500)

  const requestId = getRequestId(messages)
  expect(messages.warning).toEqual([
    `[request:start] GET ${endpointUrl} ${requestId}`,
    `[request:unhandled] GET ${endpointUrl} ${requestId}`,
    `[request:end] GET ${endpointUrl} ${requestId}`,
    `[response:bypass] ${requestId}`,
  ])

  return runtime.cleanup()
})

test('stops emitting events once the worker is stopped', async () => {
  const runtime = await createRuntime()
  const { messages } = captureConsole(runtime.page)
  const endpointUrl = `${runtime.origin}/unknown-route`

  await runtime.page.evaluate(() => {
    return window.worker.stop()
  })
  await runtime.request({
    url: endpointUrl,
  })
  await sleep(500)

  expect(messages.warning).toEqual([])

  return runtime.cleanup()
})

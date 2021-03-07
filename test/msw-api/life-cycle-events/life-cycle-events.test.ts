import * as path from 'path'
import { SetupWorkerApi } from 'msw'
import { ScenarioApi, pageWith } from 'page-with'
import { sleep, waitUntil } from '../../support/utils'

declare namespace window {
  export const msw: {
    worker: SetupWorkerApi
  }
}

function createRuntime() {
  return pageWith({
    example: path.resolve(__dirname, 'life-cycle-events.mocks.ts'),
  })
}

function getRequestId(messages: ScenarioApi['consoleSpy']) {
  const requestStartMessage = messages.get('warning').find((message) => {
    return message.startsWith('[request:start]')
  })
  return requestStartMessage.split(' ')[3]
}

test('emits events for a handled request and mocked response', async () => {
  const { request, makeUrl, consoleSpy } = await createRuntime()
  const endpointUrl = makeUrl('/user')

  await request(endpointUrl)
  await sleep(500)

  const requestId = getRequestId(consoleSpy)
  waitUntil(() =>
    expect(consoleSpy.get('warning')).toEqual([
      `[request:start] GET ${endpointUrl} ${requestId}`,
      `[request:match] GET ${endpointUrl} ${requestId}`,
      `[request:end] GET ${endpointUrl} ${requestId}`,
      `[response:mocked] response-body ${requestId}`,
    ]),
  )
})

test('emits events for a handled request with no response', async () => {
  const { request, makeUrl, consoleSpy } = await createRuntime()
  const endpointUrl = makeUrl('/no-response')

  await request(endpointUrl, {
    method: 'POST',
  })
  await sleep(500)

  const requestId = getRequestId(consoleSpy)
  waitUntil(() =>
    expect(consoleSpy.get('warning')).toEqual([
      `[request:start] POST ${endpointUrl} ${requestId}`,
      `[request:unhandled] POST ${endpointUrl} ${requestId}`,
      `[request:end] POST ${endpointUrl} ${requestId}`,
      `[response:bypass] ${requestId}`,
    ]),
  )
})

test('emits events for an unhandled request', async () => {
  const { request, makeUrl, consoleSpy } = await createRuntime()
  const endpointUrl = makeUrl('/unknown-route')

  await request(endpointUrl)
  await sleep(500)

  const requestId = getRequestId(consoleSpy)
  waitUntil(() =>
    expect(consoleSpy.get('warning')).toEqual([
      `[request:start] GET ${endpointUrl} ${requestId}`,
      `[request:unhandled] GET ${endpointUrl} ${requestId}`,
      `[request:end] GET ${endpointUrl} ${requestId}`,
      `[response:bypass] ${requestId}`,
    ]),
  )
})

test('stops emitting events once the worker is stopped', async () => {
  const { page, request, consoleSpy } = await createRuntime()

  await page.evaluate(() => {
    return window.msw.worker.stop()
  })
  await request('/unknown-route')
  await sleep(500)

  expect(consoleSpy.get('warning')).toBeUndefined()
})

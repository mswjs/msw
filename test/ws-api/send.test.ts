import * as path from 'path'
import { captureConsole } from '../support/captureConsole'
import { runBrowserWith } from '../support/runBrowserWith'

function prepareRuntime() {
  return runBrowserWith(path.resolve(__dirname, 'send.mocks.ts'))
}

test('sends the data from the mocked WebSocket server', async () => {
  const runtime = await prepareRuntime()
  const { messages } = captureConsole(runtime.page)
  await runtime.reload()

  const callbackMessage = messages.log.find((message) => {
    return message === `[client] received message: john`
  })
  expect(callbackMessage).toBeTruthy()

  return runtime.cleanup()
})

test('logs out the incoming WebSocket message event ', async () => {
  const runtime = await prepareRuntime()
  const { messages } = captureConsole(runtime.page)

  await runtime.reload()

  const incomingMessageLog = messages.startGroupCollapsed.find((message) => {
    return /^\[MSW\] \d{2}:\d{2}:\d{2} WS outgoing message event$/.test(message)
  })
  expect(incomingMessageLog).toBeTruthy()

  return runtime.cleanup()
})

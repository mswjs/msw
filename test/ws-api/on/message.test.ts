import * as path from 'path'
import { captureConsole } from '../../support/captureConsole'
import { runBrowserWith } from '../../support/runBrowserWith'

function prepareRuntime() {
  return runBrowserWith(path.resolve(__dirname, 'message.mocks.ts'))
}

test('receives the data sent from the client', async () => {
  const runtime = await prepareRuntime()
  const { messages } = captureConsole(runtime.page)

  await runtime.reload()

  const callbackMessage = messages.log.find((message) => {
    return message === '[server] received data from client: from-client'
  })
  expect(callbackMessage).toBeTruthy()

  return runtime.cleanup()
})

test('logs out the outgoing WebSocket message event ', async () => {
  const runtime = await prepareRuntime()
  const { messages } = captureConsole(runtime.page)

  await runtime.reload()

  const outgoingMessageLog = messages.startGroupCollapsed.find((message) => {
    return /^\[MSW\] \d{2}:\d{2}:\d{2} WS incoming message event$/.test(message)
  })
  expect(outgoingMessageLog).toBeTruthy()

  return runtime.cleanup()
})

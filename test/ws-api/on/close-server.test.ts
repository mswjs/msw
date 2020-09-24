import * as path from 'path'
import { runBrowserWith } from '../../support/runBrowserWith'
import { captureConsole } from '../../support/captureConsole'

function prepareRuntime() {
  return runBrowserWith(path.resolve(__dirname, 'close-server.mocks.ts'))
}

test('handles the server "close" event', async () => {
  const runtime = await prepareRuntime()
  const { messages } = captureConsole(runtime.page)
  await runtime.reload()

  // MSW log from the server.
  const serverClosedMessage = messages.startGroupCollapsed.find((message) => {
    return /^\[MSW\] \d{2}:\d{2}:\d{2} WS server closed$/.test(message)
  })
  expect(serverClosedMessage).toBeTruthy()

  // Custom callback from the mocked server.
  const customCallbackMessage = messages.log.find((message) => {
    return message === `[server] closed`
  })
  expect(customCallbackMessage).toBeTruthy()

  // Does not react on the sent events.
  const receivedEventMessage = messages.startGroupCollapsed.find((message) => {
    return /^\[MSW\] \d{2}:\d{2}:\d{2} WS incoming message event$/.test(message)
  })
  expect(receivedEventMessage).toBeUndefined()

  return runtime.cleanup()
})

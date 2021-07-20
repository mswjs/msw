import * as path from 'path'
import { runBrowserWith } from '../../support/runBrowserWith'
import { captureConsole } from '../../support/captureConsole'

function prepareRuntime() {
  return runBrowserWith(path.resolve(__dirname, 'close-client.mocks.ts'))
}

test('handles a WebSocket client "close" event', async () => {
  const runtime = await prepareRuntime()
  const { messages } = captureConsole(runtime.page)
  await runtime.reload()

  // Clicking on the "body" element closes the WebSocket client connection.
  await runtime.page.click('body')

  // MSW log from the server.
  const serverClosedMessage = messages.startGroupCollapsed.find((message) => {
    return /^\[MSW\] \d{2}:\d{2}:\d{2} WS client closed$/.test(message)
  })
  expect(serverClosedMessage).toBeTruthy()

  // Custom callback from the mocked server.
  const customCallbackMessage = messages.log.find((message) => {
    return (
      message ===
      `[server] client (wss://api.mswjs.io/) closed: code 1000, reason`
    )
  })
  expect(customCallbackMessage).toBeTruthy()

  // Custom "close" client event listener.
  const clientClosedMessage = messages.log.find((message) => {
    return message === '[client] closed'
  })
  expect(clientClosedMessage).toBeTruthy()

  return runtime.cleanup()
})

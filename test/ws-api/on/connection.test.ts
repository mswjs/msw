import * as path from 'path'
import { captureConsole } from '../../support/captureConsole'
import { runBrowserWith } from '../../support/runBrowserWith'

function prepareRuntime() {
  return runBrowserWith(path.resolve(__dirname, 'connection.mocks.ts'))
}

test('listens to a new WebSocket client connection', async () => {
  const runtime = await prepareRuntime()
  const { messages } = captureConsole(runtime.page)
  await runtime.reload()

  // Log message from the MSW.
  const mswConnectionMessage = messages.startGroupCollapsed.find((message) => {
    return /^\[MSW\] \d{2}:\d{2}:\d{2} WS client connected$/.test(message)
  })
  expect(mswConnectionMessage).toBeTruthy()

  // Custom listener of the "connection" server event.
  const customConnectionMessage = messages.log.find((message) => {
    return message === '[server] client connection: wss://api.mswjs.io/'
  })
  expect(customConnectionMessage).toBeTruthy()

  return runtime.cleanup()
})

test('listens to the WebSocket client "open" event', async () => {
  const runtime = await prepareRuntime()
  const { messages } = captureConsole(runtime.page)
  await runtime.reload()

  const clientOpenMessage = messages.log.find((message) => {
    return message === '[client] opened'
  })
  expect(clientOpenMessage).toBeTruthy()

  return runtime.cleanup()
})

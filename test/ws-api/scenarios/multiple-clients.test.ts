import * as path from 'path'
import { captureConsole } from '../../support/captureConsole'
import { runBrowserWith } from '../../support/runBrowserWith'

test('sends server event to all active clients', async () => {
  const runtime = await runBrowserWith(
    path.resolve(__dirname, './multiple-clients.mocks.ts'),
  )
  const secondPage = await runtime.browser.newPage()
  await secondPage.goto(runtime.origin)

  const { messages: firstPageMessages } = captureConsole(runtime.page)
  const { messages: secondPageMessages } = captureConsole(secondPage)
  await runtime.reload()

  // Click on the body to send an event from the client.
  await runtime.page.click('body')

  // Assert the second page has both client event and
  // server reply logged out in the console.
  const firstClientMessage = firstPageMessages.startGroupCollapsed.find(
    (message) => {
      return /\[MSW\] \d{2}:\d{2}:\d{2} WS incoming message event/.test(message)
    },
  )
  const firstServerMessage = firstPageMessages.startGroupCollapsed.find(
    (message) => {
      return /\[MSW\] \d{2}:\d{2}:\d{2} WS outgoing message event/.test(message)
    },
  )
  expect(firstClientMessage).toBeTruthy()
  expect(firstServerMessage).toBeTruthy()

  await secondPage.bringToFront()

  // Assert the first page has only the server response logged.
  const secondClientMessage = secondPageMessages.startGroupCollapsed.find(
    (message) => {
      return /\[MSW\] \d{2}:\d{2}:\d{2} WS incoming message event/.test(message)
    },
  )
  const secondServerMessage = secondPageMessages.startGroupCollapsed.find(
    (message) => {
      return /\[MSW\] \d{2}:\d{2}:\d{2} WS outgoing message event/.test(message)
    },
  )
  // Inactive tab should not log out a dispatched client event.
  expect(secondClientMessage).toBeUndefined()
  expect(secondServerMessage).toBeTruthy()

  return runtime.cleanup()
})

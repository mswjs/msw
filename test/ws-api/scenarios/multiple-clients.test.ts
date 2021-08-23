/**
 * @jest-environment node
 */
import * as path from 'path'
import { pageWith, spyOnConsole } from 'page-with'

test('sends server event to all active clients', async () => {
  const runtime = await pageWith({
    example: path.resolve(__dirname, './multiple-clients.mocks.ts'),
  })
  const secondPage = await runtime.context.newPage()
  const secondSpy = spyOnConsole(secondPage)
  await secondPage.goto(runtime.origin, { waitUntil: 'networkidle' })

  // Click on the body to send an event from the client.
  await runtime.page.click('body')

  // Assert the second page has both client event and
  // server reply logged in the console.
  expect(runtime.consoleSpy.get('startGroupCollapsed')).toEqual(
    expect.arrayContaining([
      expect.stringMatching(
        /^\[MSW\] \d{2}:\d{2}:\d{2} WS incoming message event$/,
      ),
      expect.stringMatching(
        /^\[MSW\] \d{2}:\d{2}:\d{2} WS outgoing message event$/,
      ),
    ]),
  )

  await secondPage.bringToFront()

  // Inactive tab should not log out a dispatched client event.
  expect(secondSpy.get('startGroupCollapsed')).not.toEqual(
    expect.arrayContaining([
      expect.stringMatching(
        /^\[MSW\] \d{2}:\d{2}:\d{2} WS incoming message event$/,
      ),
    ]),
  )

  expect(secondSpy.get('startGroupCollapsed')).toEqual(
    expect.arrayContaining([
      expect.stringMatching(
        /^\[MSW\] \d{2}:\d{2}:\d{2} WS outgoing message event$/,
      ),
    ]),
  )
})

/**
 * @jest-environment node
 */
import * as path from 'path'
import { pageWith } from 'page-with'

test('handles a WebSocket client "close" event', async () => {
  const runtime = await pageWith({
    example: path.resolve(__dirname, 'close-client.mocks.ts'),
  })

  // Clicking on the "body" element closes the WebSocket client connection.
  await runtime.page.click('body')

  // MSW log from the server.
  expect(runtime.consoleSpy.get('startGroupCollapsed')).toEqual(
    expect.arrayContaining([
      expect.stringMatching(/^\[MSW\] \d{2}:\d{2}:\d{2} WS client closed$/),
    ]),
  )

  // Custom callback from the mocked server.
  expect(runtime.consoleSpy.get('log')).toEqual(
    expect.arrayContaining([
      expect.stringContaining(
        '[server] client (wss://example.com/) closed: code 1000, reason',
      ),
    ]),
  )

  // Custom "close" client event listener.
  expect(runtime.consoleSpy.get('log')).toEqual(
    expect.arrayContaining([expect.stringContaining('[client] closed')]),
  )
})

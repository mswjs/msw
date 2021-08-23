/**
 * @jest-environment node
 */
import * as path from 'path'
import { pageWith } from 'page-with'

function prepareRuntime() {
  return pageWith({
    example: path.resolve(__dirname, 'connection.mocks.ts'),
  })
}

test('listens to a new WebSocket client connection', async () => {
  const runtime = await prepareRuntime()

  // Log message from the MSW.
  expect(runtime.consoleSpy.get('startGroupCollapsed')).toEqual(
    expect.arrayContaining([
      expect.stringMatching(/^\[MSW\] \d{2}:\d{2}:\d{2} WS client connected$/),
    ]),
  )

  // Custom listener of the "connection" server event.
  expect(runtime.consoleSpy.get('log')).toEqual(
    expect.arrayContaining([
      expect.stringContaining('[server] client connection: wss://example.com/'),
    ]),
  )
})

test('listens to the WebSocket client "open" event', async () => {
  const runtime = await prepareRuntime()

  expect(runtime.consoleSpy.get('log')).toEqual(
    expect.arrayContaining([expect.stringContaining('[client] opened')]),
  )
})

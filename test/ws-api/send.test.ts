/**
 * @jest-environment node
 */
import * as path from 'path'
import { pageWith } from 'page-with'

function createRuntime() {
  return pageWith({
    example: path.resolve(__dirname, 'send.mocks.ts'),
  })
}

test('sends data from the mocked WebSocket server', async () => {
  const runtime = await createRuntime()

  expect(runtime.consoleSpy.get('log')).toEqual(
    expect.arrayContaining(['[client] received message: john']),
  )
})

test('logs the outgoing WebSocket message event', async () => {
  const runtime = await createRuntime()

  expect(runtime.consoleSpy.get('startGroupCollapsed')).toEqual(
    expect.arrayContaining([
      expect.stringMatching(
        /^\[MSW\] \d{2}:\d{2}:\d{2} WS outgoing message event$/,
      ),
    ]),
  )
})

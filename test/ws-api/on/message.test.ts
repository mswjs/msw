import * as path from 'path'
import { pageWith } from 'page-with'

function createRuntime() {
  return pageWith({
    example: path.resolve(__dirname, 'message.mocks.ts'),
  })
}

test('receives the data sent from the client', async () => {
  const runtime = await createRuntime()

  expect(runtime.consoleSpy.get('log')).toEqual(
    expect.arrayContaining([
      expect.stringContaining(
        '[server] received data from client: from-client',
      ),
    ]),
  )
})

test('logs the outgoing WebSocket message event ', async () => {
  const runtime = await createRuntime()

  expect(runtime.consoleSpy.get('startGroupCollapsed')).toEqual(
    expect.arrayContaining([
      expect.stringMatching(
        /^\[MSW\] \d{2}:\d{2}:\d{2} WS incoming message event$/,
      ),
    ]),
  )
})

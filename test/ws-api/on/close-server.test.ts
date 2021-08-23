/**
 * @jest-environment node
 */
import * as path from 'path'
import { pageWith } from 'page-with'
import { waitFor } from '../../support/waitFor'

test('handles the server "close" event', async () => {
  const runtime = await pageWith({
    example: path.resolve(__dirname, 'close-server.mocks.ts'),
  })

  await waitFor(() => {
    // MSW log from the server.
    expect(runtime.consoleSpy.get('startGroupCollapsed')).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/^\[MSW\] \d{2}:\d{2}:\d{2} WS server closed$/),
      ]),
    )
  })

  // Custom callback from the mocked server.
  expect(runtime.consoleSpy.get('log')).toEqual(
    expect.arrayContaining([expect.stringContaining('[server] closed')]),
  )

  // Does not react to the sent events.
  expect(runtime.consoleSpy.get('startGroupCollapsed')).not.toEqual(
    expect.arrayContaining([
      expect.stringMatching(
        /^\[MSW\] \d{2}:\d{2}:\d{2} WS incoming message event$/,
      ),
    ]),
  )

  expect(runtime.consoleSpy.get('error')).toBeUndefined()
})

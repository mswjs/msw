import { expect, test } from '../../../setup/vitest-helpers'

test('stops emitting events once the worker is stopped', async ({
  network,
  testServer,
}) => {
  const requestStartListener = vi.fn()
  network.events.on('request:start', requestStartListener)

  if (!('stop' in network)) {
    throw new Error('Expected a browser worker instance')
  }

  await network.stop()
  await fetch(testServer.http.url('/events/passthrough'))

  expect(requestStartListener).not.toHaveBeenCalled()
})

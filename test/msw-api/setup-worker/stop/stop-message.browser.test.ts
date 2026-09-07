import { test, expect } from '../../../setup/vitest-helpers'

test('prints the console stop message', async ({ network, spyOnConsole }) => {
  if (!('stop' in network)) {
    throw new Error('Expected a browser worker instance')
  }

  const consoleSpy = spyOnConsole()
  await network.stop()

  expect(consoleSpy.get('log')).toContain('[MSW] Mocking disabled.')
})

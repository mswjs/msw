import { defineNetwork, expect } from '../../../setup/vitest-helpers'

const test = defineNetwork({ workerOptions: { quiet: true } })

test('does not print the console stop message in quiet mode', async ({
  network,
  spyOnConsole,
}) => {
  if (!('stop' in network)) {
    throw new Error('Expected a browser worker instance')
  }

  const consoleSpy = spyOnConsole()
  await network.stop()

  expect(consoleSpy.get('log')).toBeUndefined()
})

import { defineNetwork, expect } from '../../../setup/vitest-helpers'

const test = defineNetwork({ enabled: false })

test('warns on the "waitUntilReady" option in "worker.start()"', async ({
  network,
  spyOnConsole,
}) => {
  if (!('start' in network)) {
    throw new Error('Expected a browser worker instance')
  }

  const consoleSpy = spyOnConsole()
  await network.start({ waitUntilReady: true })

  expect(consoleSpy.get('warning')).toEqual([
    `[MSW] The "waitUntilReady" option has been deprecated. Please remove it from this "worker.start()" call. Follow the recommended Browser integration (https://mswjs.io/docs/integrations/browser) to eliminate any race conditions between the Service Worker registration and any requests made by your application on initial render.`,
  ])
})

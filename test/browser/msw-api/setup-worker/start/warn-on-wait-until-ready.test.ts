import { test, expect } from '../../../playwright.extend'
import { waitFor } from '../../../../support/waitFor'

test('warns on the "waitUntilReady" option in "worker.start()"', async ({
  loadExample,
  spyOnConsole,
}) => {
  const consoleSpy = spyOnConsole()
  await loadExample(require.resolve('./warn-on-wait-until-ready.mocks.ts'))

  await waitFor(() => {
    expect(consoleSpy.get('warning')).toEqual([
      `[MSW] The "waitUntilReady" option has been deprecated. Please remove it from this "worker.start()" call. Follow the recommended Browser integration (https://mswjs.io/docs/integrations/browser) to eliminate any race conditions between the Service Worker registration and any requests made by your application on initial render.`,
    ])
  })
})

import * as path from 'path'
import { runBrowserWith } from '../../../support/runBrowserWith'
import { captureConsole } from '../../../support/captureConsole'

describe('API: setupWorker / start with error', () => {
  it('should print an error if we try to start woker with a non existent worker file', async () => {
    const logs = []
    const runtime = await runBrowserWith(
      path.resolve(__dirname, 'error.mocks.ts'),
    )
    captureConsole(runtime.page, logs, (message) => {
      return message.type() === 'error'
    })
    await runtime.page.evaluate(() => {
      // @ts-ignore
      return window.window.__MSW_START__({
        serviceWorker: {
          url: 'invalidServiceWorker',
        },
      })
    })
    expect(logs).toHaveLength(1)
    expect(logs[0]).toMatchInlineSnapshot(`
      "[MSW] Failed to register a ServiceWorker for scope ('${runtime.page.url()}') with script ('${runtime.page.url()}invalidServiceWorker'): A bad HTTP response code (404) was received when fetching the script. 
            If the worker file has not been found maybe you didn't run \\"npx msw init <PUBLIC_DIR>\\""
    `)
    runtime.cleanup()
  })
})

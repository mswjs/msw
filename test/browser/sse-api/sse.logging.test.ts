import type { sse } from 'msw'
import type { setupWorker } from 'msw/browser'
import { test, expect } from '../playwright.extend'

declare namespace window {
  export const msw: {
    setupWorker: typeof setupWorker
    sse: typeof sse
  }
}

const EXAMPLE_URL = new URL('./sse.mocks.ts', import.meta.url)

const messageLogRegexp = /^\[MSW\] \d{2}:\d{2}:\d{2} SSE %s %c⇣%c message/

test('logs the sent message once per connection', async ({
  loadExample,
  spyOnConsole,
  page,
}) => {
  const consoleSpy = spyOnConsole()
  await loadExample(EXAMPLE_URL, {
    skipActivation: true,
  })

  await page.evaluate(async () => {
    const { setupWorker, sse } = window.msw

    const worker = setupWorker(
      sse('http://localhost/stream', ({ client }) => {
        client.send({
          data: 'hello',
        })
      }),
    )
    await worker.start()
  })

  const openConnection = () => {
    return page.evaluate(() => {
      return new Promise<void>((resolve, reject) => {
        const source = new EventSource('http://localhost/stream')
        source.onerror = () => {
          reject(new Error('EventSource connection errored'))
        }
        source.addEventListener('message', () => {
          // Close the connection upon receiving the message
          // to prevent `EventSource` from reconnecting.
          source.close()
          resolve()
        })
      })
    })
  }

  const getMessageLogs = () => {
    const groupLogs = consoleSpy.get('raw')?.get('startGroupCollapsed') || []

    return groupLogs.filter((message) => {
      return messageLogRegexp.test(message)
    })
  }

  await openConnection()
  await expect.poll(getMessageLogs).toHaveLength(1)

  await openConnection()
  await expect.poll(() => getMessageLogs().length).toBeGreaterThanOrEqual(2)

  /**
   * Must log the message of the second connection exactly once.
   * The logger of the first connection must not apply to other connections.
   * Wait before asserting to catch any trailing duplicated logs.
   */
  await page.waitForTimeout(250)
  expect(getMessageLogs()).toHaveLength(2)
})

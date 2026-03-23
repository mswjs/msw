import { sse } from 'msw'
import { setupWorker } from 'msw/browser'
import { test, expect } from '../playwright.extend'

declare namespace window {
  export const msw: {
    setupWorker: typeof setupWorker
    sse: typeof sse
  }
}

const EXAMPLE_URL = new URL('./sse.mocks.ts', import.meta.url)

test('does not log anything if the "quiet" option is set to true', async ({
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
          data: { username: 'john' },
        })
      }),
    )
    await worker.start({ quiet: true })
  })

  await page.evaluate(() => {
    return new Promise<string>((resolve, reject) => {
      const source = new EventSource('http://localhost/stream')
      source.onerror = () => reject()

      source.addEventListener('message', (event) => {
        resolve(`${event.type}:${event.data}`)
      })
    })
  })

  expect(consoleSpy.get('startGroupCollapsed')).toBeUndefined()
})

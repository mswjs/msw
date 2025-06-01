import { setupWorker, sse } from 'msw/browser'
import { test, expect } from '../playwright.extend'

declare namespace window {
  export const msw: {
    setupWorker: typeof setupWorker
    sse: typeof sse
  }
}

const EXAMPLE_URL = new URL('./sse.mocks.ts', import.meta.url)

test('forwards document cookies on the request when "withCredentials" is set to true', async ({
  loadExample,
  page,
  spyOnConsole,
}) => {
  const consoleSpy = spyOnConsole()
  await loadExample(EXAMPLE_URL, {
    skipActivation: true,
  })

  await page.evaluate(() => {
    document.cookie = 'foo=bar'
  })

  await page.evaluate(async () => {
    const { setupWorker, sse } = window.msw

    const worker = setupWorker(
      sse('http://localhost/stream', ({ cookies }) => {
        console.log(JSON.stringify({ cookies }))
      }),
    )
    await worker.start()
  })

  await page.evaluate((url) => {
    return new Promise<void>((resolve, reject) => {
      const source = new EventSource('http://localhost/stream', {
        withCredentials: true,
      })
      source.onopen = () => resolve()
      source.onerror = () => reject(new Error('EventSource connection failed'))
    })
  })

  expect(consoleSpy.get('log')).toContain(
    JSON.stringify({
      cookies: {
        foo: 'bar',
      },
    }),
  )
})

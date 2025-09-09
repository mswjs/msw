import type { SetupWorkerApi } from '../../../../../src/browser'
import { test, expect } from '../../../playwright.extend'

declare namespace window {
  export const msw: {
    worker: SetupWorkerApi
  }
}

test.beforeEach(() => {
  test.setTimeout(5000)
})

test.skip('resolves in-flight request even if the worker was stopped', async ({
  loadExample,
  page,
}) => {
  await loadExample(new URL('./in-flight-request.mocks.ts', import.meta.url))

  const dataPromise = page.evaluate<string>(() => {
    return fetch('/resource').then((response) => response.text())
  })

  await page.evaluate(() => {
    window.msw.worker.stop()
  })

  await expect(dataPromise).resolves.toBe('hello world')
})

test('bypasses in-flight request made after the worker was stopped', async ({
  loadExample,
  page,
  fetch,
}) => {
  const { compilation } = await loadExample(
    new URL('./in-flight-request.mocks.ts', import.meta.url),
    {
      beforeNavigation(compilation) {
        compilation.use((router) => {
          router.get('/resource', (_req, res) => {
            res.send('original response')
          })
        })
      },
    },
  )

  const resourceUrl = new URL('./resource', compilation.previewUrl)

  await page.evaluate(() => {
    window.msw.worker.stop()
  })

  const data = await page.evaluate<string>((url) => {
    return fetch(
      // eslint-disable-next-line @typescript-eslint/prefer-ts-expect-error
      // @ts-ignore TypeScript and Playwright are having a bad day, apparently.
      url,
    ).then((response) => response.text())
  }, resourceUrl.href)

  expect(data).toBe('original response')
})

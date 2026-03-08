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

test('resolves in-flight requests before the worker was stopped', async ({
  loadExample,
  page,
}) => {
  await loadExample(new URL('./in-flight-request.mocks.ts', import.meta.url))

  const dataPromise: Promise<string> = page.evaluate(() => {
    return fetch('/resource').then((response) => response.text())
  })

  await page.evaluate(() => {
    window.msw.worker.stop()
  })

  await expect(dataPromise).resolves.toBe('hello world')
})

test('bypasses requests made after the worker was stopped', async ({
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

  const data = await page.evaluate((url) => {
    return fetch(url).then((response) => response.text())
  }, resourceUrl.href)

  expect(data).toBe('original response')
})

// Note: Let's temporarily repeat this test to make it more likely to identify flakyness.
// This is not a definitive test case.
for (let testNumber = 1; testNumber <= 50; testNumber++) {
  test(`bypasses requests not immediately made after the worker was stopped, considering no default response (${testNumber})`, async ({
    loadExample,
    page,
  }) => {
    await loadExample(new URL('./in-flight-request.mocks.ts', import.meta.url))

    // Stop worker and make request in different `page.evaluate` calls.
    await page.evaluate(async () => {
      window.msw.worker.stop()
    })

    const data = await page.evaluate(async () => {
      return fetch('/resource').then((response) => response.text())
    })

    expect(data).toContain('Cannot GET /resource')
  })
}

// Note: Let's temporarily repeat this test to make it more likely to identify flakyness.
// This is not a definitive test case.
for (let testNumber = 1; testNumber <= 50; testNumber++) {
  test(`bypasses requests immediately made after the worker was stopped, considering no default response (${testNumber})`, async ({
    loadExample,
    page,
  }) => {
    await loadExample(new URL('./in-flight-request.mocks.ts', import.meta.url))

    // Stop worker and make request in the same `page.evaluate` call.
    const data = await page.evaluate(async () => {
      window.msw.worker.stop()

      return fetch('/resource').then((response) => response.text())
    })

    expect(data).toContain('Cannot GET /resource')
  })
}

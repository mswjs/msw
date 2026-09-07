import type { Page } from '@playwright/test'
import { inlineModule, test, expect } from '../../setup/playwright'

declare namespace window {
  export const msw: {
    worker: import('msw/browser').SetupWorkerApi
  }
}

const stopExample = inlineModule(({ http, HttpResponse, setupWorker }) => {
  const worker = setupWorker(
    http.get('*/resource', () => {
      return HttpResponse.json({ mocked: true })
    }),
  )
  worker.start()
  Object.assign(window, { msw: { worker } })
})

async function stopWorkerOn(page: Page): Promise<void> {
  const stopMessage = new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Failed to await the worker stop console message'))
    }, 5000)

    page.on('console', (message) => {
      if (message.text().includes('[MSW] Mocking disabled.')) {
        clearTimeout(timeout)
        resolve()
      }
    })
  })

  await page.evaluate(() => window.msw.worker.stop())
  await stopMessage
}

test('keeps mocking enabled in one tab when stopped in another', async ({
  loadExample,
  context,
  fetch,
}) => {
  const { compilation } = await loadExample(stopExample)
  const firstPage = await context.newPage()
  await firstPage.goto(compilation.previewUrl, { waitUntil: 'networkidle' })
  const secondPage = await context.newPage()
  await secondPage.goto(compilation.previewUrl, { waitUntil: 'networkidle' })

  await stopWorkerOn(firstPage)

  const response = await fetch('/resource', undefined, { page: secondPage })

  expect(response.fromServiceWorker()).toBe(true)
  await expect(response.json()).resolves.toEqual({ mocked: true })
})

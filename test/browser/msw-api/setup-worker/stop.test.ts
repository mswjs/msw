import { SetupWorkerApi } from 'msw/browser'
import { Page } from '@playwright/test'
import { test, expect } from '../../playwright.extend'

declare namespace window {
  export const msw: {
    worker: SetupWorkerApi
  }
}

const stopWorkerOn = async (page: Page) => {
  page.evaluate(() => {
    return window.msw.worker.stop()
  })

  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Failed to await the worker stop console message!'))
    }, 5000)

    page.on('console', (message) => {
      const text = message.text()

      if (
        // Successful stop console message.
        text.includes('[MSW] Mocking disabled.') ||
        // Warning when calling "stop()" multiple times.
        text.includes('worker.stop()')
      ) {
        clearTimeout(timeout)
        resolve()
      }
    })
  })
}

test('disables the mocking when the worker is stopped', async ({
  loadExample,
  fetch,
  page,
}) => {
  await loadExample(new URL('./stop.mocks.ts', import.meta.url))
  await stopWorkerOn(page)

  const res = await fetch('https://api.github.com')
  const body = await res.json()

  expect(res.fromServiceWorker()).toBe(false)
  expect(body).not.toEqual({
    mocked: true,
  })
})

test('keeps the mocking enabled in one tab when stopping the worker in another tab', async ({
  loadExample,
  context,
  fetch,
}) => {
  const { compilation } = await loadExample(
    new URL('./stop.mocks.ts', import.meta.url),
  )

  const firstPage = await context.newPage()
  await firstPage.goto(compilation.previewUrl, {
    waitUntil: 'networkidle',
  })

  const secondPage = await context.newPage()
  await secondPage.goto(compilation.previewUrl, {
    waitUntil: 'networkidle',
  })

  await stopWorkerOn(firstPage)

  // Switch to another page.
  await secondPage.bringToFront()

  const res = await fetch('https://api.github.com', undefined, {
    page: secondPage,
  })
  const body = await res.json()

  expect(res.fromServiceWorker()).toBe(true)
  expect(body).toEqual({
    mocked: true,
  })
})

test('prints a warning on multiple "worker.stop()" calls', async ({
  loadExample,
  spyOnConsole,
  page,
}) => {
  const consoleSpy = spyOnConsole()
  await loadExample(new URL('./stop.mocks.ts', import.meta.url))

  function byStopMessage(text: string): boolean {
    return text === '[MSW] Mocking disabled.'
  }

  await stopWorkerOn(page)

  // Prints the stop message and no warnings.
  expect(consoleSpy.get('log')!.filter(byStopMessage)).toHaveLength(1)
  expect(consoleSpy.get('warning')).toBeUndefined()

  await stopWorkerOn(page)

  // Does not print a duplicate stop message.
  expect(consoleSpy.get('log')!.filter(byStopMessage)).toHaveLength(1)

  // Prints a warning so the user knows something is not right.
  expect(consoleSpy.get('warning')).toEqual([
    `[MSW] Found a redundant "worker.stop()" call. Note that stopping the worker while mocking already stopped has no effect. Consider removing this "worker.stop()" call.`,
  ])
})

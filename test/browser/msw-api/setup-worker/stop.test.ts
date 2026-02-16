import { type Page } from '@playwright/test'
import { createTestHttpServer } from '@epic-web/test-server/http'
import { type SetupWorkerApi } from 'msw/browser'
import { test, expect } from '../../playwright.extend'

declare namespace window {
  export const msw: {
    worker: SetupWorkerApi
  }
}

const stopWorkerOn = async (page: Page) => {
  page.evaluate(() => {
    window.msw.worker.stop()
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
  await using server = await createTestHttpServer({
    defineRoutes(router) {
      router.get('/resource', () => {
        return Response.json(
          { original: true },
          {
            headers: {
              'Access-Control-Allow-Origin': '*',
              'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE',
              'Access-Control-Allow-Headers': 'Content-Type',
            },
          },
        )
      })
    },
  })

  await loadExample(new URL('./stop.mocks.ts', import.meta.url))
  await stopWorkerOn(page)

  const response = await fetch(server.http.url('/resource'))

  expect.soft(response.fromServiceWorker()).toBe(true)
  await expect(response.json()).resolves.toEqual({ original: true })
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

  const response = await fetch('/resource', undefined, {
    page: secondPage,
  })

  expect(response.fromServiceWorker()).toBe(true)
  await expect(response.json()).resolves.toEqual({ mocked: true })
})

test('prints a warning on multiple "worker.stop()" calls', async ({
  loadExample,
  spyOnConsole,
  page,
}) => {
  const consoleSpy = spyOnConsole()
  await loadExample(new URL('./stop.mocks.ts', import.meta.url))

  const byStopMessage = (text: string): boolean => {
    return text === '[MSW] Mocking disabled.'
  }

  await stopWorkerOn(page)

  expect(consoleSpy.get('log')!.filter(byStopMessage)).toHaveLength(1)
  expect(consoleSpy.get('warning')).toBeUndefined()

  await stopWorkerOn(page)

  // Does not print a duplicate stop message.
  expect(consoleSpy.get('log')!.filter(byStopMessage)).toHaveLength(1)

  // Prints a warning so the user knows something is not right.
  expect(consoleSpy.get('warning')).toEqual([
    `[MSW] Found a redundant "worker.stop()" call. Notice that stopping the worker after it has already been stopped has no effect. Consider removing this "worker.stop()" call.`,
  ])
})

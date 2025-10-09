import type { SetupWorkerApi } from 'msw/browser'
import { test, expect } from '../../../playwright.extend'

declare namespace window {
  export const msw: {
    createWorker(): SetupWorkerApi
  }
}

test('removes all listeners when the worker is stopped', async ({
  loadExample,
  spyOnConsole,
  browser,
  page,
  fetch,
}) => {
  const firstPageConsoleSpy = spyOnConsole()
  await loadExample(
    new URL('./removes-all-listeners.mocks.ts', import.meta.url),
    {
      skipActivation: true,
    },
  )

  await page.waitForFunction(() => {
    return typeof window.msw !== 'undefined'
  })

  await page.evaluate(async () => {
    await window.msw.createWorker().start()
  })

  const secondPage = await browser.newPage()
  const secondPageConsoleSpy = spyOnConsole(secondPage)
  await secondPage.goto(page.url())
  await secondPage.evaluate(async () => {
    const worker = window.msw.createWorker()
    await worker.start()
    worker.stop()
  })

  expect(firstPageConsoleSpy.get('startGroupCollapsed')).toEqual([
    '[MSW] Mocking enabled.',
  ])

  expect(secondPageConsoleSpy.get('startGroupCollapsed')).toEqual([
    '[MSW] Mocking enabled.',
  ])
  expect(secondPageConsoleSpy.get('log')).toContain('[MSW] Mocking disabled.')

  await page.evaluate(() => fetch('/user'))
  await page.waitForLoadState('networkidle')
  expect(firstPageConsoleSpy.get('startGroupCollapsed')).toEqual([
    '[MSW] Mocking enabled.',
    expect.stringContaining('GET /user'),
  ])

  await secondPage.evaluate(() => fetch('/user'))
  expect(secondPageConsoleSpy.get('startGroupCollapsed')).toEqual([
    '[MSW] Mocking enabled.',
  ])
})

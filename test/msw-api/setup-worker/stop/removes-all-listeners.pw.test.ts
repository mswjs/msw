import type { SetupWorkerApi } from 'msw/browser'
import { inlineSource, test, expect } from '../../../setup/playwright'

const removesAllListenersSource = inlineSource(`
import { http, HttpResponse } from 'msw'
import { setupWorker } from 'msw/browser'

const createWorker = () => {
  return setupWorker(
    http.get('/user', () => {
      return new HttpResponse()
    }),
  )
}

Object.assign(window, {
  msw: {
    createWorker,
  },
})
`)

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
  await loadExample(removesAllListenersSource, {
    skipActivation: true,
  })

  await page.waitForFunction(() => {
    return typeof window.msw !== 'undefined'
  })

  await page.evaluate(async () => {
    await window.msw.createWorker().start()
  })

  const secondPage = await browser.newPage()
  const secondPageConsoleSpy = spyOnConsole(secondPage)
  await secondPage.goto(page.url())
  await secondPage.waitForFunction(() => {
    return typeof window.msw !== 'undefined'
  })
  await secondPage.evaluate(async () => {
    const worker = window.msw.createWorker()
    await worker.start()
    await worker.stop()
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

import { SetupWorkerApi } from 'msw/browser'
import { test, expect } from '../../../playwright.extend'

declare namespace window {
  export const msw: {
    createWorker(): SetupWorkerApi
  }
}

test('removes all listeners when the worker is stopped', async ({
  loadExample,
  spyOnConsole,
  waitFor,
  page,
  fetch,
}) => {
  const consoleSpy = spyOnConsole()
  await loadExample(require.resolve('./removes-all-listeners.mocks.ts'), {
    skipActivation: true,
  })

  await page.waitForFunction(() => {
    return typeof window.msw !== 'undefined'
  })

  await page.evaluate(() => {
    const firstWorker = window.msw.createWorker()
    const secondWorker = window.msw.createWorker()

    return firstWorker.start().then(() => {
      firstWorker.stop()
      return secondWorker.start()
    })
  })

  expect(consoleSpy.get('startGroupCollapsed')).toEqual([
    '[MSW] Mocking enabled.',
    '[MSW] Mocking enabled.',
  ])

  await fetch('/user')

  await waitFor(() => {
    expect(consoleSpy.get('startGroupCollapsed')).toEqual([
      '[MSW] Mocking enabled.',
      '[MSW] Mocking enabled.',
      expect.stringContaining('GET /user'),
    ])
  })
})

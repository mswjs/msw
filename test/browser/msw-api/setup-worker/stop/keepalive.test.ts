import type { SetupWorkerApi } from 'msw/browser'
import { test, expect } from '../../../playwright.extend'

declare namespace window {
  export const msw: {
    worker: SetupWorkerApi
    getKeepaliveRequests(): number
  }
}

test('stops sending keepalive requests after "worker.stop()"', async ({
  loadExample,
  page,
}) => {
  await loadExample(new URL('./keepalive.mocks.ts', import.meta.url))

  await page.waitForFunction(() => {
    return window.msw.getKeepaliveRequests() >= 2
  })

  await page.evaluate(() => {
    window.msw.worker.stop()
  })

  await page.waitForTimeout(75)
  const requestsAfterStop = await page.evaluate(() => {
    return window.msw.getKeepaliveRequests()
  })

  await page.waitForTimeout(200)
  const requestsAfterWait = await page.evaluate(() => {
    return window.msw.getKeepaliveRequests()
  })

  expect(requestsAfterWait).toBe(requestsAfterStop)
})

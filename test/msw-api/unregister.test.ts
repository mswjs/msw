import { SetupWorkerApi } from 'msw'
import { test, expect } from '../playwright.extend'
import { sleep } from '../support/utils'

declare namespace window {
  export const msw: {
    worker: SetupWorkerApi
  }
}

test('unregisters itself when not prompted to be activated again', async ({
  loadExample,
  page,
  fetch,
}) => {
  await loadExample(require.resolve('./unregister.mocks.ts'))

  await page.evaluate(() => {
    return window.msw.worker.start()
  })
  await sleep(1000)

  // Should have the mocking enabled.
  const firstResponse = await fetch('https://api.github.com')
  const headers = firstResponse.headers()
  const body = await firstResponse.json()

  expect(headers).toHaveProperty('x-powered-by', 'msw')
  expect(body).toEqual({
    mocked: true,
  })

  // Reload the page, not starting the worker manually this time.
  await page.reload()

  const secondResponse = await fetch('https://api.github.com')
  const secondBody = await secondResponse.json()

  expect(secondResponse.headers()).not.toHaveProperty('x-powered-by', 'msw')
  expect(secondBody).not.toEqual({
    mocked: true,
  })

  // Refresh the page the second time.
  await page.reload()
  const thirdResponse = await fetch('https://api.github.com')
  const thirdBody = await thirdResponse.json()

  expect(secondResponse.headers()).not.toHaveProperty('x-powered-by', 'msw')
  expect(thirdBody).not.toEqual({
    mocked: true,
  })
})

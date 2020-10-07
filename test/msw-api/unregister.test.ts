import * as path from 'path'
import { runBrowserWith } from '../support/runBrowserWith'

function createRuntime() {
  return runBrowserWith(path.resolve(__dirname, 'unregister.mocks.ts'))
}

test('unregisters itself when not prompted to be activated again', async () => {
  const runtime = await createRuntime()
  await runtime.page.evaluate(() => {
    // @ts-ignore
    return window.__mswStart()
  })
  await new Promise((resolve) => {
    setTimeout(resolve, 1000)
  })

  // Should have the mocking enabled.
  const firstResponse = await runtime.request({
    url: 'https://api.github.com',
  })
  const headers = firstResponse.headers()
  const body = await firstResponse.json()

  expect(headers).toHaveProperty('x-powered-by', 'msw')
  expect(body).toEqual({
    mocked: true,
  })

  // Reload the page, not starting the worker manually this time.
  await runtime.page.reload()

  const secondResponse = await runtime.request({
    url: 'https://api.github.com',
  })
  const secondBody = await secondResponse.json()

  expect(secondResponse.fromServiceWorker()).toBe(false)
  expect(secondBody).not.toEqual({
    mocked: true,
  })

  // Refresh the page the second time.
  await runtime.page.reload()
  const thirdResponse = await runtime.request({
    url: 'https://api.github.com',
  })
  const thirdBody = await thirdResponse.json()

  expect(thirdResponse.fromServiceWorker()).toBe(false)
  expect(thirdBody).not.toEqual({
    mocked: true,
  })

  return runtime.cleanup()
})

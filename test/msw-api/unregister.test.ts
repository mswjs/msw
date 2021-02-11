import * as path from 'path'
import { pageWith } from 'page-with'
import { SetupWorkerApi } from 'msw'
import { sleep } from '../support/utils'

declare namespace window {
  export const msw: {
    worker: SetupWorkerApi
  }
}

function createRuntime() {
  return pageWith({
    example: path.resolve(__dirname, 'unregister.mocks.ts'),
  })
}

test('unregisters itself when not prompted to be activated again', async () => {
  const runtime = await createRuntime()
  await runtime.page.evaluate(() => {
    return window.msw.worker.start()
  })
  await sleep(1000)

  // Should have the mocking enabled.
  const firstResponse = await runtime.request('https://api.github.com')
  const headers = firstResponse.headers()
  const body = await firstResponse.json()

  expect(headers).toHaveProperty('x-powered-by', 'msw')
  expect(body).toEqual({
    mocked: true,
  })

  // Reload the page, not starting the worker manually this time.
  await runtime.page.reload()

  const secondResponse = await runtime.request('https://api.github.com')
  const secondBody = await secondResponse.json()

  expect(secondResponse.headers()).not.toHaveProperty('x-powered-by', 'msw')
  expect(secondBody).not.toEqual({
    mocked: true,
  })

  // Refresh the page the second time.
  await runtime.page.reload()
  const thirdResponse = await runtime.request('https://api.github.com')
  const thirdBody = await thirdResponse.json()

  expect(secondResponse.headers()).not.toHaveProperty('x-powered-by', 'msw')
  expect(thirdBody).not.toEqual({
    mocked: true,
  })
})

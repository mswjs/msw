import * as path from 'path'
import { Page } from 'puppeteer'
import { SetupWorkerApi } from 'msw'
import {
  runBrowserWith,
  createRequestHelper,
} from '../../support/runBrowserWith'
import { sleep } from '../../support/utils'

declare namespace window {
  export const msw: {
    worker: SetupWorkerApi
  }
}

function createRuntime() {
  return runBrowserWith(path.resolve(__dirname, 'stop.mocks.ts'))
}

const stopWorkerOn = async (page: Page) => {
  await page.evaluate(() => {
    return window.msw.worker.stop()
  })

  return sleep(1000)
}

test('disables the mocking when the worker is stopped', async () => {
  const runtime = await createRuntime()
  await stopWorkerOn(runtime.page)

  const res = await runtime.request({
    url: 'https://api.github.com',
  })
  const headers = res.headers()
  const body = await res.json()

  expect(headers).not.toHaveProperty('x-powered-by', 'msw')
  expect(body).not.toEqual({
    mocked: true,
  })

  return runtime.cleanup()
})

test('keeps the mocking enabled in one tab when stopping the worker in another tab', async () => {
  const runtime = await createRuntime()
  const firstPage = await runtime.browser.newPage()
  await firstPage.goto(runtime.origin, {
    waitUntil: 'networkidle0',
  })
  const secondPage = await runtime.browser.newPage()
  await secondPage.goto(runtime.origin, {
    waitUntil: 'networkidle0',
  })

  await stopWorkerOn(firstPage)

  // Switch to another page.
  await secondPage.bringToFront()

  // Creating a request handler for the new page.
  const request = createRequestHelper(secondPage)
  const res = await request({
    url: 'https://api.github.com',
  })
  const headers = res.headers()
  const body = await res.json()

  expect(headers).toHaveProperty('x-powered-by', 'msw')
  expect(body).toEqual({
    mocked: true,
  })

  return runtime.cleanup()
})

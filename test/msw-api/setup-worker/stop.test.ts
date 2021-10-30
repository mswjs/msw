import * as path from 'path'
import { Page, pageWith, createRequestUtil } from 'page-with'
import { SetupWorkerApi } from 'msw'
import { sleep } from '../../support/utils'

declare namespace window {
  export const msw: {
    worker: SetupWorkerApi
  }
}

function createRuntime() {
  return pageWith({
    example: path.resolve(__dirname, 'stop.mocks.ts'),
  })
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

  const res = await runtime.request('https://api.github.com')
  const headers = await res.allHeaders()
  const body = await res.json()

  expect(headers).not.toHaveProperty('x-powered-by', 'msw')
  expect(body).not.toEqual({
    mocked: true,
  })
})

test('keeps the mocking enabled in one tab when stopping the worker in another tab', async () => {
  const { context, origin, server } = await createRuntime()
  const firstPage = await context.newPage()
  await firstPage.goto(origin, {
    waitUntil: 'networkidle',
  })
  const secondPage = await context.newPage()
  await secondPage.goto(origin, {
    waitUntil: 'networkidle',
  })

  await stopWorkerOn(firstPage)

  // Switch to another page.
  await secondPage.bringToFront()

  // Create a request handler for the new page.
  const request = createRequestUtil(secondPage, server)
  const res = await request('https://api.github.com')
  const headers = await res.allHeaders()
  const body = await res.json()

  expect(headers).toHaveProperty('x-powered-by', 'msw')
  expect(body).toEqual({
    mocked: true,
  })
})

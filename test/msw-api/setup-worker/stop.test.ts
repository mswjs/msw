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
  const runtime = await createRuntime()

  const firstPage = await runtime.context.newPage()
  await firstPage.goto(runtime.origin, {
    waitUntil: 'networkidle',
  })
  const secondPage = await runtime.context.newPage()
  await secondPage.goto(runtime.origin, {
    waitUntil: 'networkidle',
  })

  await stopWorkerOn(firstPage)

  // Switch to another page.
  await secondPage.bringToFront()

  // Create a request handler for the new page.
  const request = createRequestUtil(secondPage, runtime.server)
  const res = await request('https://api.github.com')
  const headers = await res.allHeaders()
  const body = await res.json()

  expect(headers).toHaveProperty('x-powered-by', 'msw')
  expect(body).toEqual({
    mocked: true,
  })
})

test('prints a warning on multiple "worker.stop()" calls', async () => {
  const runtime = await createRuntime()

  function byStopMessage(text: string): boolean {
    return text === '[MSW] Mocking disabled.'
  }

  await stopWorkerOn(runtime.page)

  // Prints the stop message and no warnings.
  expect(runtime.consoleSpy.get('log').filter(byStopMessage)).toHaveLength(1)
  expect(runtime.consoleSpy.get('warning')).toBeUndefined()

  await stopWorkerOn(runtime.page)

  // Does not print a duplicate stop message.
  expect(runtime.consoleSpy.get('log').filter(byStopMessage)).toHaveLength(1)

  // Prints a warning so the user knows something is not right.
  expect(runtime.consoleSpy.get('warning')).toEqual([
    `[MSW] Found a redundant "worker.stop()" call. Note that stopping the worker while mocking already stopped has no effect. Consider removing this "worker.stop()" call.`,
  ])
})

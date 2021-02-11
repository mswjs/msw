import * as path from 'path'
import { pageWith } from 'page-with'
import { SetupWorkerApi } from 'msw'

declare namespace window {
  export const msw: {
    createWorker(): SetupWorkerApi
  }
}

test('removes all listeners when the worker is stopped', async () => {
  const { page, request, consoleSpy } = await pageWith({
    example: path.resolve(__dirname, 'removes-all-listeners.mocks.ts'),
  })

  await page.evaluate(() => {
    const worker1 = window.msw.createWorker()
    const worker2 = window.msw.createWorker()

    return worker1.start().then(() => {
      worker1.stop()
      return worker2.start()
    })
  })
  const activationMessages = consoleSpy
    .get('startGroupCollapsed')
    .filter((text) => {
      return text.includes('[MSW] Mocking enabled.')
    })
  expect(activationMessages).toHaveLength(2)

  await request('/user')

  const requestLogs = consoleSpy.get('startGroupCollapsed').filter((text) => {
    return text.includes('[MSW]') && text.includes('GET /user')
  })

  expect(requestLogs).toHaveLength(1)
})

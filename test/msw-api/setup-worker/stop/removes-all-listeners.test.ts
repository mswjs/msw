import * as path from 'path'
import { pageWith } from 'page-with'
import { SetupWorkerApi } from 'msw'
import { waitFor } from '../../../support/waitFor'

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

  await request('/user')

  await waitFor(() => {
    expect(consoleSpy.get('startGroupCollapsed')).toEqual([
      '[MSW] Mocking enabled.',
      '[MSW] Mocking enabled.',
      expect.stringContaining('GET /user'),
    ])
  })
})

import * as path from 'path'
import { pageWith } from 'page-with'
import { SetupWorkerApi } from 'msw'

declare namespace window {
  export const msw: {
    registration: ReturnType<SetupWorkerApi['start']>
  }
}

test('resolves the "start" Promise after the worker has been activated', async () => {
  const { page, consoleSpy } = await pageWith({
    example: path.resolve(__dirname, 'start.mocks.ts'),
  })
  const resolvedPayload = await page.evaluate(() => {
    return window.msw.registration
  })

  expect(resolvedPayload).toBe('ServiceWorkerRegistration')

  await page.reload()

  const activationMessageIndex = consoleSpy
    .get('startGroupCollapsed')
    .findIndex((text) => {
      return text.includes('[MSW] Mocking enabled')
    })

  const customMessageIndex = consoleSpy.get('log').findIndex((text) => {
    return text.includes('Registration Promise resolved')
  })

  expect(activationMessageIndex).toBeGreaterThan(-1)
  expect(customMessageIndex).toBeGreaterThan(-1)
  expect(customMessageIndex).toBeGreaterThan(activationMessageIndex)
})

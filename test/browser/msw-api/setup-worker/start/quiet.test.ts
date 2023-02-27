import { SetupWorkerApi } from 'msw'
import { test, expect } from '../../../playwright.extend'

declare namespace window {
  export const msw: {
    registration: ReturnType<SetupWorkerApi['start']>
  }
}

test('does not log the captured request when the "quiet" option is set to "true"', async ({
  loadExample,
  spyOnConsole,
  page,
  fetch,
}) => {
  const consoleSpy = spyOnConsole()
  await loadExample(require.resolve('./quiet.mocks.ts'), {
    // Using the "quiet" option to suppress the activation message.
    skipActivation: true,
  })

  await page.waitForFunction(() => {
    return typeof window.msw !== 'undefined'
  })

  await page.evaluate(() => {
    return window.msw.registration
  })

  expect(consoleSpy.get('startGroupCollapsed')).toBeUndefined()

  const res = await fetch('/user')

  const headers = await res.allHeaders()
  const body = await res.json()

  expect(headers).toHaveProperty('x-powered-by', 'msw')
  expect(body).toEqual({
    firstName: 'John',
    age: 32,
  })

  expect(consoleSpy.get('startGroupCollapsed')).toBeUndefined()
})

import * as path from 'path'
import { pageWith } from 'page-with'
import { SetupWorkerApi } from 'msw'

declare namespace window {
  export const msw: {
    registration: ReturnType<SetupWorkerApi['start']>
  }
}

test('does not log the captured request when the "quiet" option is set to "true"', async () => {
  const { page, request, consoleSpy } = await pageWith({
    example: path.resolve(__dirname, 'quiet.mocks.ts'),
  })

  await page.evaluate(() => {
    return window.msw.registration
  })

  await page.reload()

  expect(consoleSpy.get('startGroupCollapsed')).toBeUndefined()

  const res = await request('/user')

  const headers = res.headers()
  const body = await res.json()

  expect(headers).toHaveProperty('x-powered-by', 'msw')
  expect(body).toEqual({
    firstName: 'John',
    age: 32,
  })

  expect(consoleSpy.get('startGroupCollapsed')).toBeUndefined()
})

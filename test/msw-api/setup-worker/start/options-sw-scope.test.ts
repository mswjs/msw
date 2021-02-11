import * as path from 'path'
import { pageWith } from 'page-with'

test('respects a custom "scope" Service Worker option', async () => {
  const { page, request, consoleSpy } = await pageWith({
    example: path.resolve(__dirname, 'options-sw-scope.mocks.ts'),
  })
  await page.reload()

  const activationMessage = consoleSpy
    .get('startGroupCollapsed')
    .find((text) => {
      return text.includes('[MSW] Mocking enabled.')
    })
  expect(activationMessage).toBeTruthy()

  const res = await request('/user')
  const status = res.status()

  // Since the root "/" page lies outside of the custom worker scope,
  // it won't be able to intercept an otherwise matching request.
  expect(status).toBe(404)
})

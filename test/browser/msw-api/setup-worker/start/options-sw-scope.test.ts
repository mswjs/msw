import * as path from 'path'
import { test, expect } from '../../../playwright.extend'

test('respects a custom "scope" Service Worker option', async ({
  loadExample,
  spyOnConsole,
  fetch,
}) => {
  const consoleSpy = spyOnConsole()
  await loadExample(path.resolve(__dirname, 'options-sw-scope.mocks.ts'))

  expect(consoleSpy.get('startGroupCollapsed')).toEqual(
    expect.arrayContaining([expect.stringContaining('[MSW] Mocking enabled.')]),
  )

  const res = await fetch('/user')
  const status = res.status()

  // Since the root "/" page lies outside of the custom worker scope,
  // it won't be able to intercept an otherwise matching request.
  expect(status).toBe(404)
})

import * as path from 'path'
import { pageWith } from 'page-with'

function createRuntime() {
  return pageWith({ example: path.resolve(__dirname, 'basic.mocks.ts') })
}

test('prints a captured request info into browser console', async () => {
  const runtime = await createRuntime()

  await runtime.request('https://api.github.com/users/octocat')

  const requestLog = runtime.consoleSpy
    .get('startGroupCollapsed')
    .find((text) => {
      // No way to assert the entire format of the log entry,
      // because Playwright intercepts `console.log` calls,
      // which contain unformatted strings (with %s, %c, styles).
      return text.includes('https://api.github.com/users/octocat')
    })

  // Request log must include a timestamp.
  expect(requestLog).toMatch(/\d{2}:\d{2}:\d{2}/)

  // Request log must include the request method.
  expect(requestLog).toContain('GET')

  // Request log must include the response status code.
  expect(requestLog).toContain('200')
})

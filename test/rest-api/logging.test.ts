import * as path from 'path'
import { runBrowserWith } from '../support/runBrowserWith'
import { captureConsole } from '../support/captureConsole'

function createRuntime() {
  return runBrowserWith(path.resolve(__dirname, 'basic.mocks.ts'))
}

test('prints a captured request info into browser console', async () => {
  const runtime = await createRuntime()
  const { messages } = captureConsole(runtime.page)

  await runtime.request({
    url: 'https://api.github.com/users/octocat',
  })

  const requestLog = messages.startGroupCollapsed.find((text) => {
    // No way to assert the entire format of the log entry,
    // because Puppeteer intercepts `console.log` calls,
    // which contain unformatted strings (with %s, %c, styles).
    return text.includes('https://api.github.com/users/octocat')
  })

  // Request log must include a timestamp.
  expect(requestLog).toMatch(/\d{2}:\d{2}:\d{2}/)

  // Request log must include the request method.
  expect(requestLog).toContain('GET')

  // Request log must include the response status code.
  expect(requestLog).toContain('200')

  return runtime.cleanup()
})

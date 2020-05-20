import * as path from 'path'
import { TestAPI, runBrowserWith } from '../support/runBrowserWith'
import { captureConsole, filterLibraryLogs } from '../support/captureConsole'

describe('REST: Logging', () => {
  let test: TestAPI

  beforeAll(async () => {
    test = await runBrowserWith(path.resolve(__dirname, 'basic.mocks.ts'))
  })

  afterAll(() => {
    return test.cleanup()
  })

  describe('given I performed a REST API request', () => {
    let requestLog: string

    beforeAll(async () => {
      const logs: string[] = []
      captureConsole(test.page, logs, filterLibraryLogs)

      await test.request({
        url: 'https://api.github.com/users/octocat',
      })

      requestLog = logs.find((message) => {
        // No way to assert the entire format of the log entry,
        // because Puppeteer intercepts `console.log` calls,
        // which contain unformatted strings (with %s, %c, styles).
        return message.includes('https://api.github.com/users/octocat')
      })
    })

    describe('should print an information about the request in browser console', () => {
      it('with a timestamp', () => {
        expect(requestLog).toMatch(/\d{2}:\d{2}:\d{2}/)
      })

      it('with the request method', () => {
        expect(requestLog).toContain('GET')
      })

      it('with the response status code', () => {
        expect(requestLog).toContain('200')
      })
    })
  })
})

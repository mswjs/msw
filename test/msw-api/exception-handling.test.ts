import * as path from 'path'
import { TestAPI, runBrowserWith } from '../support/runBrowserWith'

describe('Exception handling', () => {
  describe('given exception in a request handler', () => {
    let api: TestAPI

    beforeAll(async () => {
      api = await runBrowserWith(
        path.resolve(__dirname, 'exception-handling.mocks.ts'),
      )
    })

    afterAll(() => {
      return api.cleanup()
    })

    it('should activate without errors', async () => {
      const errorMessages: string[] = []

      api.page.on('console', function(message) {
        if (message.type() === 'error') {
          errorMessages.push(message.text())
        }
      })

      await api.page.goto(api.origin, {
        waitUntil: 'networkidle0',
      })

      expect(errorMessages).toHaveLength(0)
    })

    it('should transform exception into 500 response', async () => {
      const REQUEST_URL = 'https://api.github.com/users/octocat'
      api.page.evaluate((url) => fetch(url), REQUEST_URL)
      const res = await api.page.waitForResponse(REQUEST_URL)
      const body = await res.json()

      expect(res.status()).toEqual(500)
      expect(res.headers()).not.toHaveProperty('x-powered-by', 'msw')
      expect(body).toHaveProperty('errorType', 'ReferenceError')
      expect(body).toHaveProperty('message', 'nonExisting is not defined')
    })
  })
})

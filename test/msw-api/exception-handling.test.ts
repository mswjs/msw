import * as path from 'path'
import { TestAPI, runBrowserWith } from '../support/runBrowserWith'

describe('Exception handling', () => {
  describe('given exception in a request handler', () => {
    let test: TestAPI

    beforeAll(async () => {
      test = await runBrowserWith(
        path.resolve(__dirname, 'exception-handling.mocks.ts'),
      )
    })

    afterAll(() => {
      return test.cleanup()
    })

    it('should activate without errors', async () => {
      const errorMessages: string[] = []

      test.page.on('console', function (message) {
        if (message.type() === 'error') {
          errorMessages.push(message.text())
        }
      })

      await test.reload()

      expect(errorMessages).toHaveLength(0)
    })

    it('should transform exception into 500 response', async () => {
      const res = await test.request({
        url: 'https://api.github.com/users/octocat',
      })
      const status = res.status()
      const headers = res.headers()
      const body = await res.json()

      expect(status).toEqual(500)
      expect(headers).not.toHaveProperty('x-powered-by', 'msw')
      expect(body).toHaveProperty('errorType', 'ReferenceError')
      expect(body).toHaveProperty('message', 'nonExisting is not defined')
    })
  })
})

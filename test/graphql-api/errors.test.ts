import * as path from 'path'
import { Response } from 'puppeteer'
import { TestAPI, runBrowserWith } from '../support/runBrowserWith'
import { executeOperation } from './utils/executeOperation'

describe('GraphQL: Errors', () => {
  let test: TestAPI

  beforeAll(async () => {
    test = await runBrowserWith(path.resolve(__dirname, 'errors.mocks.ts'))
  })

  afterAll(() => {
    return test.cleanup()
  })

  describe('given mocked query errors', () => {
    let res: Response
    let body: Record<string, any>

    beforeAll(async () => {
      res = await executeOperation(test.page, {
        query: `
          query Login {
            user {
              id
            }
          }
        `,
      })
      body = await res.json()
    })

    it('should return 200 status code', () => {
      expect(res.status()).toBe(200)
    })

    it('should not return any data', () => {
      expect(body).not.toHaveProperty('data')
    })

    it('should mock the error', () => {
      expect(body).toHaveProperty('errors', [
        {
          message: 'This is a mocked error',
          locations: [
            {
              line: 1,
              column: 2,
            },
          ],
        },
      ])
    })
  })
})

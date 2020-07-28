import * as path from 'path'
import { TestAPI, runBrowserWith } from '../support/runBrowserWith'
import { executeOperation } from './utils/executeOperation'
import { captureConsole, filterLibraryLogs } from '../support/captureConsole'

describe('GraphQL: Logging', () => {
  let test: TestAPI

  beforeAll(async () => {
    test = await runBrowserWith(path.resolve(__dirname, 'logging.mocks.ts'))
  })

  afterAll(() => {
    return test.cleanup()
  })

  describe('given I perform a GraphQL query', () => {
    let requestLog: string

    beforeAll(async () => {
      const { messages } = captureConsole(test.page, filterLibraryLogs)

      await executeOperation(test.page, {
        query: `
          query GetUserDetail {
            user {
              firstName
              lastName
            }
          }
        `,
      })

      requestLog = messages.startGroupCollapsed.find((text) => {
        return text.includes('GetUserDetail')
      })
    })

    describe('should print an information about the request in browser console', () => {
      it('with a timestamp', () => {
        expect(requestLog).toMatch(/\d{2}:\d{2}:\d{2}/)
      })

      it('with the request operation name', () => {
        expect(requestLog).toContain('GetUserDetail')
      })

      it('with the response status code', () => {
        expect(requestLog).toContain('200')
      })
    })
  })

  describe('given I perform a GraphQL mutation', () => {
    let requestLog: string

    beforeAll(async () => {
      const { messages } = captureConsole(test.page, filterLibraryLogs)

      await executeOperation(test.page, {
        query: `
          mutation Login {
            user {
              id
            }
          }
        `,
      })

      requestLog = messages.startGroupCollapsed.find((text) => {
        return text.includes('Login')
      })
    })

    describe('should print an information about the request in browser console', () => {
      it('with a timestamp', () => {
        expect(requestLog).toMatch(/\d{2}:\d{2}:\d{2}/)
      })

      it('with the request operation name', () => {
        expect(requestLog).toContain('Login')
      })

      it('with the response status code', () => {
        expect(requestLog).toContain('200')
      })
    })
  })
})

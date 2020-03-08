import * as path from 'path'
import { TestAPI, runBrowserWith } from '../support/runBrowserWith'
import { executeOperation } from './utils/executeOperation'

describe('GraphQL: Mutation', () => {
  let api: TestAPI

  beforeAll(async () => {
    api = await runBrowserWith(path.resolve(__dirname, 'mutation.mocks.ts'))
  })

  afterAll(() => {
    return api.cleanup()
  })

  it('should mock the mutation response', async () => {
    const res = await executeOperation(api.page, {
      query: `
        mutation Logout {
          logout {
            userSession
          }
        }
      `,
    })
    const headers = res.headers()
    const body = await res.json()

    expect(res.status()).toEqual(200)
    expect(headers).toHaveProperty('content-type', 'application/json')
    expect(body).toEqual({
      data: {
        logout: {
          userSession: false,
        },
      },
    })
  })
})

import * as path from 'path'
import { runBrowserWith, TestAPI } from '../support/runBrowserWith'
import { executeOperation } from './utils/executeOperation'

function createRuntime() {
  return runBrowserWith(path.resolve(__dirname, 'mutation.mocks.ts'))
}

let runtime: TestAPI

beforeAll(async () => {
  runtime = await createRuntime()
})
afterAll(async () => {
  await runtime.cleanup()
})

test('sends a mocked response to a GraphQL mutation', async () => {
  const res = await executeOperation(runtime.page, {
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

import * as path from 'path'
import { runBrowserWith, TestAPI } from '../support/runBrowserWith'
import { executeOperation } from './utils/executeOperation'

function createRuntime() {
  return runBrowserWith(path.resolve(__dirname, 'query.mocks.ts'))
}

let runtime: TestAPI

beforeAll(async () => {
  runtime = await createRuntime()
})
afterAll(async () => {
  await runtime.cleanup()
})

test('mocks a GraphQL query issued with a GET request', async () => {
  const res = await executeOperation(
    runtime.page,
    {
      query: `
      query GetUserDetail {
        user {
          firstName
          lastName
        }
      }
    `,
    },
    {
      method: 'GET',
    },
  )

  const headers = res.headers()
  const body = await res.json()

  expect(res.status()).toEqual(200)
  expect(headers).toHaveProperty('content-type', 'application/json')
  expect(body).toEqual({
    data: {
      user: {
        firstName: 'John',
        lastName: 'Maverick',
      },
    },
  })
})

test('mocks a GraphQL query issued with a POST request', async () => {
  const res = await executeOperation(runtime.page, {
    query: `
      query GetUserDetail {
        user {
          firstName
          lastName
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
      user: {
        firstName: 'John',
        lastName: 'Maverick',
      },
    },
  })
})

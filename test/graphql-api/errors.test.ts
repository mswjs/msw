import * as path from 'path'
import { runBrowserWith, TestAPI } from '../support/runBrowserWith'
import { executeOperation } from './utils/executeOperation'

function createRuntime() {
  return runBrowserWith(path.resolve(__dirname, 'errors.mocks.ts'))
}

let runtime: TestAPI

beforeAll(async () => {
  runtime = await createRuntime()
})
afterAll(async () => {
  await runtime.cleanup()
})

test('mocks a GraphQL error response', async () => {
  const res = await executeOperation(runtime.page, {
    query: `
        query Login {
          user {
            id
          }
        }
      `,
  })
  const status = res.status()
  const body = await res.json()

  expect(status).toBe(200)
  expect(body).not.toHaveProperty('data')
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

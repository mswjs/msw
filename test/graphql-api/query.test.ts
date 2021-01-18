import * as path from 'path'
import { runBrowserWith } from '../support/runBrowserWith'
import { executeOperation } from './utils/executeOperation'

test('mocks a GraphQL query issued with a GET request', async () => {
  const runtime = await runBrowserWith(
    path.resolve(__dirname, 'query.mocks.ts'),
  )

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

  await runtime.cleanup()
})

test('mocks a GraphQL query issued with a POST request', async () => {
  const runtime = await runBrowserWith(
    path.resolve(__dirname, 'query.mocks.ts'),
  )

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

  await runtime.cleanup()
})

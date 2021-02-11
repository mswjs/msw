import * as path from 'path'
import { pageWith } from 'page-with'
import { executeGraphQLQuery } from './utils/executeGraphQLQuery'

function createRuntime() {
  return pageWith({
    example: path.resolve(__dirname, 'query.mocks.ts'),
  })
}

test('mocks a GraphQL query issued with a GET request', async () => {
  const runtime = await createRuntime()

  const res = await executeGraphQLQuery(
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
  const runtime = await createRuntime()

  const res = await executeGraphQLQuery(runtime.page, {
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

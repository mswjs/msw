import * as path from 'path'
import { pageWith } from 'page-with'
import { executeGraphQLQuery } from './utils/executeGraphQLQuery'

test('sends a mocked response to a GraphQL mutation', async () => {
  const runtime = await pageWith({
    example: path.resolve(__dirname, 'mutation.mocks.ts'),
  })

  const res = await executeGraphQLQuery(runtime.page, {
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

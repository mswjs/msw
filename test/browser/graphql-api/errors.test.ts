import { test, expect } from '../playwright.extend'
import { gql } from '../../support/graphql'

test('mocks a GraphQL error response', async ({ loadExample, query }) => {
  await loadExample(require.resolve('./errors.mocks.ts'))

  const res = await query('/graphql', {
    query: gql`
      query Login {
        user {
          id
        }
      }
    `,
  })
  const body = await res.json()

  expect(res.status()).toBe(200)
  expect(body).toEqual({
    errors: [
      {
        message: 'This is a mocked error',
        locations: [
          {
            line: 1,
            column: 2,
          },
        ],
      },
    ],
  })
})

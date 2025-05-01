import { test, expect } from '../playwright.extend'

test('mocks a GraphQL error response', async ({ loadExample, query }) => {
  await loadExample(new URL('./errors.mocks.ts', import.meta.url))

  const res = await query('/graphql', {
    query: /* GraphQL */ `
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

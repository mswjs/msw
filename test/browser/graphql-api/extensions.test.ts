import { test, expect } from '../playwright.extend'

test('mocks a GraphQL response with both data and extensions', async ({
  loadExample,
  query,
}) => {
  await loadExample(new URL('./extensions.mocks.ts', import.meta.url))

  const res = await query('/graphql', {
    query: /* GraphQL */ `
      query Login {
        user {
          id
          name
          password
        }
      }
    `,
  })
  const status = res.status()
  const body = await res.json()

  expect(status).toBe(200)
  expect(body).toEqual({
    data: {
      user: {
        id: 1,
        name: 'Joe Bloggs',
        password: 'HelloWorld!',
      },
    },
    extensions: {
      message: 'This is a mocked extension',
      tracking: {
        version: '0.1.2',
        page: '/test/',
      },
    },
  })
})

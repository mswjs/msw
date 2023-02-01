import { test, expect } from '../playwright.extend'
import { gql } from '../../support/graphql'

test('mocks a GraphQL response with both data and extensions', async ({
  loadExample,
  query,
}) => {
  await loadExample(require.resolve('./extensions.mocks.ts'))

  const res = await query('/graphql', {
    query: gql`
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

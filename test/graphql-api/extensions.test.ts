import * as path from 'path'
import { pageWith } from 'page-with'
import { executeGraphQLQuery } from './utils/executeGraphQLQuery'

test('mocks a GraphQL response with both data and extensions', async () => {
  const runtime = await pageWith({
    example: path.resolve(__dirname, 'extensions.mocks.ts'),
  })

  const res = await executeGraphQLQuery(runtime.page, {
    query: `
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
  expect(body).not.toHaveProperty('errors')
  expect(body).toHaveProperty('data', {
    user: {
      id: 1,
      name: 'Joe Bloggs',
      password: 'HelloWorld!',
    },
  })
  expect(body).toHaveProperty('extensions', {
    message: 'This is a mocked extension ',
    tracking: {
      version: '0.1.2',
      page: '/test/',
    },
  })
})

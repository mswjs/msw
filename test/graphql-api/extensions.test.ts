import * as path from 'path'
import { pageWith } from 'page-with'
import { ExecutionResult } from 'graphql'
import { executeGraphQLQuery } from './utils/executeGraphQLQuery'
import { gql } from '../support/graphql'

test('mocks a GraphQL response with both data and extensions', async () => {
  const runtime = await pageWith({
    example: path.resolve(__dirname, 'extensions.mocks.ts'),
  })

  const res = await executeGraphQLQuery(runtime.page, {
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
  const body: ExecutionResult = await res.json()

  expect(status).toEqual(200)
  expect(body.errors).toBeUndefined()
  expect(body.data).toEqual({
    user: {
      id: 1,
      name: 'Joe Bloggs',
      password: 'HelloWorld!',
    },
  })
  expect(body.extensions).toEqual({
    message: 'This is a mocked extension',
    tracking: {
      version: '0.1.2',
      page: '/test/',
    },
  })
})

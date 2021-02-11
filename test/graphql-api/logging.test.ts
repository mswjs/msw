import * as path from 'path'
import { executeGraphQLQuery } from './utils/executeGraphQLQuery'
import { pageWith } from 'page-with'

function createRuntime() {
  return pageWith({
    example: path.resolve(__dirname, 'logging.mocks.ts'),
  })
}

test('logs out GraphQL queries', async () => {
  const { page, consoleSpy } = await createRuntime()

  await executeGraphQLQuery(page, {
    query: `
      query GetUserDetail {
        user {
          firstName
          lastName
        }
      }
    `,
  })

  const queryMessage = consoleSpy.get('startGroupCollapsed').find((text) => {
    return text.includes('GetUserDetail')
  })

  expect(queryMessage).toMatch(/\d{2}:\d{2}:\d{2}/)
  expect(queryMessage).toContain('GetUserDetail')
  expect(queryMessage).toContain('200')
})

test('logs out GraphQL mutations', async () => {
  const { page, consoleSpy } = await createRuntime()

  await executeGraphQLQuery(page, {
    query: `
      mutation Login {
        user {
          id
        }
      }
    `,
  })

  const mutationMessage = consoleSpy.get('startGroupCollapsed').find((text) => {
    return text.includes('Login')
  })

  expect(mutationMessage).toMatch(/\d{2}:\d{2}:\d{2}/)
  expect(mutationMessage).toContain('Login')
  expect(mutationMessage).toContain('200')
})

import * as path from 'path'
import { executeGraphQLQuery } from './utils/executeGraphQLQuery'
import { pageWith } from 'page-with'
import { gql } from '../support/graphql'

function createRuntime() {
  return pageWith({
    example: path.resolve(__dirname, 'logging.mocks.ts'),
  })
}

test('prints a log for a GraphQL query', async () => {
  const { page, consoleSpy } = await createRuntime()
  await executeGraphQLQuery(page, {
    query: gql`
      query GetUserDetail {
        user {
          firstName
          lastName
        }
      }
    `,
  })

  expect(consoleSpy.get('startGroupCollapsed')).toEqual(
    expect.arrayContaining([
      expect.stringMatching(
        /\[MSW\] \d{2}:\d{2}:\d{2} query GetUserDetail 200 OK/,
      ),
    ]),
  )
})

test('prints a log for a GraphQL mutation', async () => {
  const { page, consoleSpy } = await createRuntime()
  await executeGraphQLQuery(page, {
    query: gql`
      mutation Login {
        user {
          id
        }
      }
    `,
  })

  expect(consoleSpy.get('startGroupCollapsed')).toEqual(
    expect.arrayContaining([
      expect.stringMatching(/\[MSW\] \d{2}:\d{2}:\d{2} mutation Login 200 OK/),
    ]),
  )
})

test('prints a log for a GraphQL query intercepted via "graphql.operation"', async () => {
  const { page, consoleSpy } = await createRuntime()
  await executeGraphQLQuery(page, {
    query: gql`
      query GetLatestPosts {
        posts {
          title
        }
      }
    `,
  })

  expect(consoleSpy.get('startGroupCollapsed')).toEqual(
    expect.arrayContaining([
      expect.stringMatching(
        /\[MSW\] \d{2}:\d{2}:\d{2} query GetLatestPosts 301 Moved Permanently/,
      ),
    ]),
  )
})

test('prints a log for a GraphQL mutation intercepted via "graphql.operation"', async () => {
  const runtime = await createRuntime()
  await executeGraphQLQuery(runtime.page, {
    query: gql`
      mutation CreatePost {
        post {
          id
        }
      }
    `,
  })

  expect(runtime.consoleSpy.get('startGroupCollapsed')).toEqual(
    expect.arrayContaining([
      expect.stringMatching(
        /^\[MSW\] \d{2}:\d{2}:\d{2} mutation CreatePost 301 Moved Permanently$/,
      ),
    ]),
  )
})

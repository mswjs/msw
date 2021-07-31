import * as path from 'path'
import { executeGraphQLQuery } from './utils/executeGraphQLQuery'
import { pageWith } from 'page-with'
import { gql } from '../support/graphql'
import { StatusCodeColor } from '../../src/utils/logging/getStatusCodeColor'

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

  expect(consoleSpy.get('raw').get('startGroupCollapsed')).toEqual(
    expect.arrayContaining([
      expect.stringMatching(
        new RegExp(
          `^\\[MSW\\] %s %s \\(%c%s%c\\) \\d{2}:\\d{2}:\\d{2} query GetUserDetail color:${StatusCodeColor.Success} 200 OK color:inherit$`,
        ),
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

  expect(consoleSpy.get('raw').get('startGroupCollapsed')).toEqual(
    expect.arrayContaining([
      expect.stringMatching(
        new RegExp(
          `\\[MSW\\] %s %s \\(%c%s%c\\) \\d{2}:\\d{2}:\\d{2} mutation Login color:${StatusCodeColor.Success} 200 OK color:inherit$`,
        ),
      ),
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

  expect(consoleSpy.get('raw').get('startGroupCollapsed')).toEqual(
    expect.arrayContaining([
      expect.stringMatching(
        new RegExp(
          `\\[MSW\\] %s %s \\(%c%s%c\\) \\d{2}:\\d{2}:\\d{2} query GetLatestPosts color:${StatusCodeColor.Warning} 301 Moved Permanently color:inherit$`,
        ),
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

  expect(runtime.consoleSpy.get('raw').get('startGroupCollapsed')).toEqual(
    expect.arrayContaining([
      expect.stringMatching(
        new RegExp(
          `\\[MSW\\] %s %s \\(%c%s%c\\) \\d{2}:\\d{2}:\\d{2} mutation CreatePost color:${StatusCodeColor.Warning} 301 Moved Permanently color:inherit$`,
        ),
      ),
    ]),
  )
})

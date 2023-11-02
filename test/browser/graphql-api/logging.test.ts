import { StatusCodeColor } from '../../../src/core/utils/logging/getStatusCodeColor'
import { waitFor } from '../../support/waitFor'
import { test, expect } from '../playwright.extend'
import { gql } from '../../support/graphql'

const LOGGING_EXAMPLE = require.resolve('./logging.mocks.ts')

test('prints a log for a GraphQL query', async ({
  loadExample,
  spyOnConsole,
  query,
}) => {
  const consoleSpy = spyOnConsole()
  await loadExample(LOGGING_EXAMPLE)

  await query('/graphql', {
    query: gql`
      query GetUserDetail {
        user {
          firstName
          lastName
        }
      }
    `,
  })

  await waitFor(() => {
    expect(consoleSpy.get('raw')?.get('startGroupCollapsed')).toEqual(
      expect.arrayContaining([
        expect.stringMatching(
          new RegExp(
            `^\\[MSW\\] \\d{2}:\\d{2}:\\d{2} query GetUserDetail \\(%c200 OK%c\\) color:${StatusCodeColor.Success} color:inherit$`,
          ),
        ),
      ]),
    )
  })
})

test('prints a log for a GraphQL mutation', async ({
  loadExample,
  spyOnConsole,
  query,
}) => {
  const consoleSpy = spyOnConsole()
  await loadExample(LOGGING_EXAMPLE)

  await query('/graphql', {
    query: gql`
      mutation Login {
        user {
          id
        }
      }
    `,
  })

  await waitFor(() => {
    expect(consoleSpy.get('raw')?.get('startGroupCollapsed')).toEqual(
      expect.arrayContaining([
        expect.stringMatching(
          new RegExp(
            `\\[MSW\\] \\d{2}:\\d{2}:\\d{2} mutation Login \\(%c200 OK%c\\) color:${StatusCodeColor.Success} color:inherit$`,
          ),
        ),
      ]),
    )
  })
})

test('prints a log for a GraphQL query intercepted via "graphql.operation"', async ({
  loadExample,
  spyOnConsole,
  query,
}) => {
  const consoleSpy = spyOnConsole()
  await loadExample(LOGGING_EXAMPLE)

  await query('/graphql', {
    query: gql`
      query GetLatestPosts {
        posts {
          title
        }
      }
    `,
  })

  await waitFor(() => {
    expect(consoleSpy.get('raw')?.get('startGroupCollapsed')).toEqual(
      expect.arrayContaining([
        expect.stringMatching(
          new RegExp(
            `\\[MSW\\] \\d{2}:\\d{2}:\\d{2} query GetLatestPosts \\(%c301 Moved Permanently%c\\) color:${StatusCodeColor.Warning} color:inherit$`,
          ),
        ),
      ]),
    )
  })
})

test('prints a log for a GraphQL mutation intercepted via "graphql.operation"', async ({
  loadExample,
  spyOnConsole,
  query,
}) => {
  const consoleSpy = spyOnConsole()
  await loadExample(LOGGING_EXAMPLE)

  await query('/graphql', {
    query: gql`
      mutation CreatePost {
        post {
          id
        }
      }
    `,
  })

  await waitFor(() => {
    expect(consoleSpy.get('raw')?.get('startGroupCollapsed')).toEqual(
      expect.arrayContaining([
        expect.stringMatching(
          new RegExp(
            `^\\[MSW\\] \\d{2}:\\d{2}:\\d{2} mutation CreatePost \\(%c301 Moved Permanently%c\\) color:${StatusCodeColor.Warning} color:inherit$`,
          ),
        ),
      ]),
    )
  })
})

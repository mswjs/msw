import { test, expect } from '../playwright.extend'
import { waitFor } from '../../support/waitFor'

const EXAMPLE_PATH = new URL('./logging.mocks.ts', import.meta.url)

test('prints a log for a GraphQL query', async ({
  loadExample,
  spyOnConsole,
  query,
}) => {
  const consoleSpy = spyOnConsole()
  await loadExample(EXAMPLE_PATH)

  await query('/graphql', {
    query: /* GraphQL */ `
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
            `^\\[MSW\\] \\d{2}:\\d{2}:\\d{2} query GetUserDetail \\(%c200 OK%c\\) color:#69AB32 color:inherit$`,
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
  await loadExample(EXAMPLE_PATH)

  await query('/graphql', {
    query: /* GraphQL */ `
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
            `\\[MSW\\] \\d{2}:\\d{2}:\\d{2} mutation Login \\(%c200 OK%c\\) color:#69AB32 color:inherit$`,
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
  await loadExample(EXAMPLE_PATH)

  await query('/graphql', {
    query: /* GraphQL */ `
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
            `\\[MSW\\] \\d{2}:\\d{2}:\\d{2} query GetLatestPosts \\(%c301 Moved Permanently%c\\) color:#F0BB4B color:inherit$`,
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
  await loadExample(EXAMPLE_PATH)

  await query('/graphql', {
    query: /* GraphQL */ `
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
            `^\\[MSW\\] \\d{2}:\\d{2}:\\d{2} mutation CreatePost \\(%c301 Moved Permanently%c\\) color:#F0BB4B color:inherit$`,
          ),
        ),
      ]),
    )
  })
})

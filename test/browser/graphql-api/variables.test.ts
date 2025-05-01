import { test, expect } from '../playwright.extend'

const EXAMPLE_PATH = new URL('./variables.mocks.ts', import.meta.url)

test('can access variables from a GraphQL query', async ({
  loadExample,
  query,
}) => {
  await loadExample(EXAMPLE_PATH)

  const response = await query('/graphql', {
    query: /* GraphQL */ `
      query GetGithubUser($username: String!) {
        user(login: $username) {
          firstName
          username
        }
      }
    `,
    variables: {
      username: 'octocat',
    },
  })

  expect(response.status()).toBe(200)
  await expect(response.json()).resolves.toEqual({
    data: {
      user: {
        firstName: 'John',
        username: 'octocat',
      },
    },
  })
})

test('can access variables from a GraphQL mutation', async ({
  loadExample,
  query,
}) => {
  await loadExample(EXAMPLE_PATH)

  const response = await query('/graphql', {
    query: /* GraphQL */ `
      mutation DeletePost($postId: String!) {
        deletePost(id: $postId) {
          postId
        }
      }
    `,
    variables: {
      postId: 'abc-123',
    },
  })

  expect(response.status()).toBe(200)
  await expect(response.json()).resolves.toEqual({
    data: {
      deletePost: {
        postId: 'abc-123',
      },
    },
  })
})

test('returns an empty object when accessing variables from a GraphQL operation without them', async ({
  loadExample,
  query,
}) => {
  await loadExample(EXAMPLE_PATH)

  const response = await query('/graphql', {
    query: /* GraphQL */ `
      query GetActiveUser {
        user {
          id
        }
      }
    `,
  })

  expect(response.status()).toBe(200)
  await expect(response.json()).resolves.toEqual({
    data: {
      user: {
        id: 1,
      },
    },
  })
})

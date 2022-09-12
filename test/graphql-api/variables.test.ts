import { gql } from '../support/graphql'
import { test, expect } from '../playwright.extend'

const EXAMPLE_PATH = require.resolve('./variables.mocks.ts')

test('can access variables from a GraphQL query', async ({
  loadExample,
  query,
}) => {
  await loadExample(EXAMPLE_PATH)

  const res = await query('/graphql', {
    query: gql`
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
  const status = res.status()
  const body = await res.json()

  expect(status).toBe(200)
  expect(body).toEqual({
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

  const res = await query('/graphql', {
    query: gql`
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
  const status = res.status()
  const body = await res.json()

  expect(status).toBe(200)
  expect(body).toEqual({
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

  const res = await query('/graphql', {
    query: gql`
      query GetActiveUser {
        user {
          id
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
      },
    },
  })
})

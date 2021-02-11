import * as path from 'path'
import { pageWith } from 'page-with'
import { executeGraphQLQuery } from './utils/executeGraphQLQuery'

function createRuntime() {
  return pageWith({
    example: path.resolve(__dirname, 'variables.mocks.ts'),
  })
}

test('can access variables from a GraphQL query', async () => {
  const runtime = await createRuntime()

  const res = await executeGraphQLQuery(runtime.page, {
    query: `
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

test('can access variables from a GraphQL mutation', async () => {
  const runtime = await createRuntime()

  const res = await executeGraphQLQuery(runtime.page, {
    query: `
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

test('returns an empty object when accessing variables from a GraphQL operation without them', async () => {
  const runtime = await createRuntime()

  const res = await executeGraphQLQuery(runtime.page, {
    query: `
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

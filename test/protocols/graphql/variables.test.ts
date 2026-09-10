import { HttpResponse } from 'msw'
import { graphql } from 'msw/graphql'
import { gql } from '../../support/graphql'
import { defineNetwork, expect } from '../../setup/vitest-helpers'

const api = graphql.link('*')

interface GetGitHubUserQuery {
  user: {
    username: string
    firstName: string
  }
}

interface GetGitHubUserQueryVariables {
  username: string
}

interface DeletePostQuery {
  deletePost: {
    postId: string
  }
}

interface DeletePostQueryVariables {
  postId: string
}

interface GetActiveUserQuery {
  user: {
    id: number
  }
}

interface GetActiveUserQueryVariables {
  userId: string
}

const handlers = [
  api.query<GetGitHubUserQuery, GetGitHubUserQueryVariables>(
    'GetGithubUser',
    ({ variables }) => {
      const { username } = variables

      return HttpResponse.json({
        data: {
          user: {
            username,
            firstName: 'John',
          },
        },
      })
    },
  ),
  api.mutation<DeletePostQuery, DeletePostQueryVariables>(
    'DeletePost',
    ({ variables }) => {
      const { postId } = variables

      return HttpResponse.json({
        data: {
          deletePost: {
            postId,
          },
        },
      })
    },
  ),
  api.query<GetActiveUserQuery, GetActiveUserQueryVariables>(
    'GetActiveUser',
    ({ variables }) => {
      // Intentionally unused variable
      const { userId } = variables

      return HttpResponse.json({
        data: {
          user: {
            id: 1,
          },
        },
      })
    },
  ),
]

const test = defineNetwork({ handlers })

test('can access variables from a GraphQL query', async ({ query }) => {
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

test('can access variables from a GraphQL mutation', async ({ query }) => {
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
  query,
}) => {
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

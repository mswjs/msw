import { setupWorker, graphql } from 'msw'

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
  foo: string
}

const worker = setupWorker(
  graphql.query<GetGitHubUserQuery, GetGitHubUserQueryVariables>(
    'GetGithubUser',
    (req, res, ctx) => {
      const { username } = req.variables

      return res(
        ctx.data({
          user: {
            username,
            firstName: 'John',
          },
        }),
      )
    },
  ),

  graphql.mutation<DeletePostQuery, DeletePostQueryVariables>(
    'DeletePost',
    (req, res, ctx) => {
      const { postId } = req.variables

      return res(
        ctx.data({
          deletePost: {
            postId,
          },
        }),
      )
    },
  ),

  graphql.query<GetActiveUserQuery, GetActiveUserQueryVariables>(
    'GetActiveUser',
    (req, res, ctx) => {
      // Intentionally unused variable
      // eslint-disable-next-line
      const { foo } = req.variables

      return res(
        ctx.data({
          user: {
            id: 1,
          },
        }),
      )
    },
  ),
)

worker.start()

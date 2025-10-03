import { graphql, HttpResponse } from 'msw'
import { setupWorker } from 'msw/browser'

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

const worker = setupWorker(
  graphql.query<GetGitHubUserQuery, GetGitHubUserQueryVariables>(
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

  graphql.mutation<DeletePostQuery, DeletePostQueryVariables>(
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

  graphql.query<GetActiveUserQuery, GetActiveUserQueryVariables>(
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
)

worker.start()

import { HttpResponse } from 'msw'
import { graphql } from 'msw/graphql'
import { setupWorker } from 'msw/browser'

const api = graphql.link('http://localhost:8080/graphql')

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
)

worker.start()

import { composeMocks, graphql } from 'msw'

const { start } = composeMocks(
  graphql.query({ operation: 'GetGithubUser' }, (req, res, ctx) => {
    const { username } = req.variables

    return res(
      ctx.data({
        user: {
          firstName: 'John',
          username,
        },
      }),
    )
  }),

  graphql.mutation({ operation: 'DeletePost' }, (req, res, ctx) => {
    const { postId } = req.variables

    return res(
      ctx.data({
        deletePost: {
          postId,
        },
      }),
    )
  }),

  graphql.query({ operation: 'GetActiveUser' }, (req, res, ctx) => {
    // Intentionally unused variable
    const { foo } = req.variables

    return res(
      ctx.data({
        user: {
          id: 1,
        },
      }),
    )
  }),
)

start()

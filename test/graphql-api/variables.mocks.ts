import { setupWorker, graphql } from 'msw'

const worker = setupWorker(
  graphql.query('GetGithubUser', (req, res, ctx) => {
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

  graphql.mutation('DeletePost', (req, res, ctx) => {
    const { postId } = req.variables

    return res(
      ctx.data({
        deletePost: {
          postId,
        },
      }),
    )
  }),

  graphql.query('GetActiveUser', (req, res, ctx) => {
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
  }),
)

worker.start()

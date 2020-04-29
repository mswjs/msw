import { setupWorker, graphql } from 'msw'

const worker = setupWorker(
  graphql.mutation('Logout', (req, res, ctx) => {
    return res(
      ctx.data({
        logout: {
          userSession: false,
        },
      }),
    )
  }),
)

worker.start()

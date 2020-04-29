import { setupWorker, graphql } from 'msw'

const worker = setupWorker(
  graphql.query('GetUserDetail', (req, res, ctx) => {
    return res(
      ctx.data({
        user: {
          firstName: 'John',
          lastName: 'Maverick',
        },
      }),
    )
  }),
)

worker.start()

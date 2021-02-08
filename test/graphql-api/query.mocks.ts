import { setupWorker, graphql } from 'msw'

interface GetUserDetailQuery {
  user: {
    firstName: string
    lastName: string
  }
}

const worker = setupWorker(
  graphql.query<GetUserDetailQuery>('GetUserDetail', (req, res, ctx) => {
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

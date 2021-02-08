import { setupWorker, graphql } from 'msw'

interface GetUserDetailQuery {
  user: {
    firstName: string
    lastName: string
  }
}

interface LoginQuery {
  user: {
    id: string
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
  graphql.mutation<LoginQuery>('Login', (req, res, ctx) => {
    return res(
      ctx.data({
        user: {
          id: 'abc-123',
        },
      }),
    )
  }),
)

worker.start()

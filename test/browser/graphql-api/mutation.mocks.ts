import { setupWorker, graphql } from 'msw'

interface LogoutQuery {
  logout: {
    userSession: boolean
  }
}

const worker = setupWorker(
  graphql.mutation<LogoutQuery>('Logout', (req, res, ctx) => {
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

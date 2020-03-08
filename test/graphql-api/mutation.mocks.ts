import { composeMocks, graphql } from 'msw'

const { start } = composeMocks(
  graphql.mutation({ operation: 'Logout' }, (req, res, ctx) => {
    return res(
      ctx.data({
        logout: {
          userSession: false,
        },
      }),
    )
  }),
)

start()

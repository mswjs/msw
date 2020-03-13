import { composeMocks, graphql } from 'msw'

const { start } = composeMocks(
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

start()

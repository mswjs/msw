import { composeMocks, graphql } from 'msw'

const { start } = composeMocks(
  graphql.query({ operation: 'GetUserDetail' }, (req, res, ctx) => {
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

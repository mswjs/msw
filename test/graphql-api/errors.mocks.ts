import { composeMocks, graphql } from 'msw'

const { start } = composeMocks(
  graphql.query({ operation: 'Login' }, (req, res, ctx) => {
    return res(
      ctx.errors([
        {
          message: 'This is a mocked error',
          locations: [
            {
              line: 1,
              column: 2,
            },
          ],
        },
      ]),
    )
  }),
)

start()

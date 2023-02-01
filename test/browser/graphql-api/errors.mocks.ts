import { setupWorker, graphql } from 'msw'

const worker = setupWorker(
  graphql.query('Login', (req, res, ctx) => {
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

worker.start()

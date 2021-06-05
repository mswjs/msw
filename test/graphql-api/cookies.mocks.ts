import { setupWorker, graphql } from 'msw'

const worker = setupWorker(
  graphql.query('GetUser', (req, res, ctx) => {
    return res(
      ctx.cookie('test-cookie', 'value'),
      ctx.data({
        firstName: 'John',
      }),
    )
  }),
)

worker.start()

import { setupWorker, graphql } from 'msw'

const worker = setupWorker(
  graphql.query('me', (req, res, ctx) => {
    return res(
      ctx.cookie('test-cookie', 'value'),
      ctx.data({
        id: '00000000-0000-0000-0000-000000000000',
      }),
    )
  }),
)

worker.start()

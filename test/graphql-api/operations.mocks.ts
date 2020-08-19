import { setupWorker, graphql } from 'msw'

const worker = setupWorker(
  graphql.operations((req, res, ctx) => {
    return res(
      ctx.data({
        query: req.body.query,
        variables: req.body.variables,
      }),
    )
  }),
)

worker.start()

import { setupWorker, graphql } from 'msw'

const worker = setupWorker(
  graphql.query('GetUser', (req, res, ctx) => {
    return res(
      ctx.data({
        query: req.body.query,
        variables: req.body.variables,
      }),
    )
  }),
  graphql.mutation('Login', (req, res, ctx) => {
    return res(
      ctx.data({
        query: req.body.query,
        variables: req.body.variables,
      }),
    )
  }),
)

worker.start()

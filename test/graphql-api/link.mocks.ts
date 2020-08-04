import { setupWorker, graphql } from 'msw'

const github = graphql.link('https://api.github.com/graphql')
const stripe = graphql.link('https://api.stripe.com/graphql')

const worker = setupWorker(
  github.query('GetUser', (req, res, ctx) => {
    return res(
      ctx.data({
        user: {
          id: '46cfe8ff-a79b-42af-9699-b56e2239d1bb',
          username: req.variables.username,
        },
      }),
    )
  }),
  stripe.mutation('Payment', (req, res, ctx) => {
    return res(
      ctx.data({
        bankAccount: {
          totalFunds: 100 + req.variables.amount,
        },
      }),
    )
  }),
  graphql.query('GetUser', (req, res, ctx) => {
    return res(
      ctx.set('x-request-handler', 'fallback'),
      ctx.data({
        user: {
          id: '46cfe8ff-a79b-42af-9699-b56e2239d1bb',
          username: req.variables.username,
        },
      }),
    )
  }),
)

worker.start()

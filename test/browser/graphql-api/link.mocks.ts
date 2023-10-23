import { graphql, HttpResponse } from 'msw'
import { setupWorker } from 'msw/browser'

const github = graphql.link('https://api.github.com/graphql')
const stripe = graphql.link('https://api.stripe.com/graphql')

interface GetUserQuery {
  user: {
    id: string
    username: string
  }
}

interface PaymentQuery {
  bankAccount: {
    totalFunds: number
  }
}

interface GetUserQuery {
  user: {
    id: string
    username: string
  }
}

const worker = setupWorker(
  github.query<GetUserQuery, { username: string }>(
    'GetUser',
    ({ variables }) => {
      return HttpResponse.json({
        data: {
          user: {
            id: '46cfe8ff-a79b-42af-9699-b56e2239d1bb',
            username: variables.username,
          },
        },
      })
    },
  ),
  stripe.mutation<PaymentQuery, { amount: number }>(
    'Payment',
    ({ variables }) => {
      return HttpResponse.json({
        data: {
          bankAccount: {
            totalFunds: 100 + variables.amount,
          },
        },
      })
    },
  ),
  graphql.query<GetUserQuery, { username: string }>(
    'GetUser',
    ({ variables }) => {
      return HttpResponse.json(
        {
          data: {
            user: {
              id: '46cfe8ff-a79b-42af-9699-b56e2239d1bb',
              username: variables.username,
            },
          },
        },
        {
          headers: {
            'X-Request-Handler': 'fallback',
          },
        },
      )
    },
  ),
)

worker.start()

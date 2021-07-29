import { parse } from 'graphql'
import { setupWorker, graphql } from 'msw'

const GetUser = parse(`
  query GetUser {
    user {
      firstName
    }
  }
`)

const Login = parse(`
  mutation Login($username: String!) {
    session {
      id
    }
    user {
      username
    }
  }
`)

const GetSubscription = parse(`
  query GetSubscription {
    subscription {
      id
    }
  }
`)

const github = graphql.link('https://api.github.com/graphql')

const worker = setupWorker(
  // "DocumentNode" can be used as the expected query/mutation.
  graphql.query(GetUser, (req, res, ctx) => {
    return res(
      ctx.data({
        // Note that inferring the query body and variables
        // is impossible with the native "DocumentNode".
        // Consider using tools like GraphQL Code Generator.
        user: {
          firstName: 'John',
        },
      }),
    )
  }),
  graphql.mutation(Login, (req, res, ctx) => {
    return res(
      ctx.data({
        session: {
          id: 'abc-123',
        },
        user: {
          username: req.variables.username,
        },
      }),
    )
  }),
  github.query(GetSubscription, (req, res, ctx) => {
    return res(
      ctx.data({
        subscription: {
          id: 123,
        },
      }),
    )
  }),
)

worker.start()

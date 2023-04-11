import { parse } from 'graphql'
import { graphql, HttpResponse } from 'msw'
import { setupWorker } from 'msw/browser'

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
  graphql.query(GetUser, () => {
    return HttpResponse.json({
      data: {
        // Note that inferring the query body and variables
        // is impossible with the native "DocumentNode".
        // Consider using tools like GraphQL Code Generator.
        user: {
          firstName: 'John',
        },
      },
    })
  }),
  graphql.mutation<object, { username: string }>(Login, ({ variables }) => {
    return HttpResponse.json({
      data: {
        session: {
          id: 'abc-123',
        },
        user: {
          username: variables.username,
        },
      },
    })
  }),
  github.query(GetSubscription, () => {
    return HttpResponse.json({
      data: {
        subscription: {
          id: 123,
        },
      },
    })
  }),
)

worker.start()

import { FetchResult, createApolloFetch } from 'apollo-fetch'
import { graphql } from 'msw'
import { setupServer } from 'msw/node'

const fetch = createApolloFetch({
  uri: 'http://localhost:3000',
})

const GET_USER_DETAIL = `
query GetUserDetail($userId: String!) {
  user {
    id,
    firstName
    age
  }
}
`

const LOGIN = `
mutation Login($username: String!) {
  user {
    id
  }
}
`

describe('setupServer / graphql', () => {
  const server = setupServer(
    graphql.query('GetUserDetail', (req, res, ctx) => {
      const { userId } = req.variables

      return res(
        ctx.data({
          user: {
            id: userId,
            firstName: 'John',
            age: 32,
          },
        }),
      )
    }),
    graphql.mutation('Login', (req, res, ctx) => {
      const { username } = req.variables

      return res(
        ctx.errors([
          {
            message: `User "${username}" is not found`,
            locations: [
              {
                line: 12,
                column: 4,
              },
            ],
          },
        ]),
      )
    }),
  )

  beforeAll(() => {
    server.listen()
  })

  afterAll(() => {
    server.close()
  })

  describe('given I perform a GraphQL query', () => {
    let res: FetchResult

    beforeAll(async () => {
      res = await fetch({
        query: GET_USER_DETAIL,
        variables: {
          userId: 'abc-123',
        },
      })
    })

    test('should return a mocked response data', async () => {
      expect(res.data).toEqual({
        user: {
          id: 'abc-123',
          firstName: 'John',
          age: 32,
        },
      })
    })
  })

  describe('given I perform a GraphQL mutation', () => {
    let res: FetchResult

    beforeAll(async () => {
      res = await fetch({
        query: LOGIN,
        variables: {
          username: 'john',
        },
      })
    })

    test('should return a mocked error response', async () => {
      expect(res.data).toBeUndefined()
      expect(res.errors).toEqual([
        {
          message: `User "john" is not found`,
          locations: [
            {
              line: 12,
              column: 4,
            },
          ],
        },
      ])
    })
  })
})

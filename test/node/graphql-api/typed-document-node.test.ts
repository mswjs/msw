// @vitest-environment node
import { graphql, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import {
  gql,
  createTypedGraphQlNode,
  createGraphQLClient,
} from '../../support/graphql'

const server = setupServer()

beforeAll(() => {
  server.listen()
})

afterEach(() => {
  server.resetHandlers()
})

afterAll(() => {
  server.close()
})

it('supports TypedDocumentNode as request predicate', async () => {
  const GET_USER = gql`
    query GetUser($id: ID!) {
      user(id: $id) {
        id
        name
      }
    }
  `

  const documentNode = createTypedGraphQlNode<
    { user: { id: string; name: string } },
    { id: string }
  >(GET_USER)

  server.use(
    graphql.query(documentNode, ({ variables }) => {
      return HttpResponse.json({
        data: {
          user: {
            id: variables.id,
            name: 'John Doe',
          },
        },
      })
    }),
  )

  const client = createGraphQLClient({
    uri: 'http://localhost:3000/graphql',
  })

  const result = await client({
    query: GET_USER,
    variables: {
      id: 'abc-123',
    },
  })

  expect
    .soft(result.data)
    .toEqual({ user: { id: 'abc-123', name: 'John Doe' } })
  expect.soft(result.errors).toBeUndefined()
})

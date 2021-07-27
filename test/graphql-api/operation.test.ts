import * as path from 'path'
import { pageWith } from 'page-with'
import { executeGraphQLQuery } from './utils/executeGraphQLQuery'
import { sleep } from '../support/utils'
import { gql } from '../support/graphql'

function createRuntime() {
  return pageWith({
    example: path.resolve(__dirname, 'operation.mocks.ts'),
    routes(app) {
      app.post('/search', (req, res) => {
        return res.json({ results: [1, 2, 3] })
      })
    },
  })
}

test('intercepts and mocks a GraphQL query', async () => {
  const runtime = await createRuntime()
  const GET_USER_QUERY = gql`
    query GetUser($id: String!) {
      query
      variables
    }
  `

  const res = await executeGraphQLQuery(runtime.page, {
    query: GET_USER_QUERY,
    variables: {
      id: 'abc-123',
    },
  })
  const headers = res.headers()
  const body = await res.json()

  expect(res.status()).toEqual(200)
  expect(headers).toHaveProperty('x-powered-by', 'msw')
  expect(body).toEqual({
    data: {
      query: GET_USER_QUERY,
      variables: {
        id: 'abc-123',
      },
    },
  })
  expect(runtime.consoleSpy.get('startGroupCollapsed')).toEqual(
    expect.arrayContaining([
      expect.stringMatching(/\[MSW\] \d{2}:\d{2}:\d{2} query GetUser 200 OK/),
    ]),
  )
})

test('intercepts and mocks a GraphQL mutation', async () => {
  const runtime = await createRuntime()
  const LOGIN_MUTATION = gql`
    mutation Login($username: String!, $password: String!) {
      mutation
      variables
    }
  `

  const res = await executeGraphQLQuery(runtime.page, {
    query: LOGIN_MUTATION,
    variables: {
      username: 'john',
      password: 'super-secret',
    },
  })
  const headers = res.headers()
  const body = await res.json()

  expect(res.status()).toEqual(200)
  expect(headers).toHaveProperty('x-powered-by', 'msw')
  expect(body).toEqual({
    data: {
      query: LOGIN_MUTATION,
      variables: {
        username: 'john',
        password: 'super-secret',
      },
    },
  })
})

test('propagates parsing errors from the invalid GraphQL requests', async () => {
  const { page, consoleSpy } = await createRuntime()
  const INVALID_QUERY = `
    # Intentionally invalid GraphQL query.
    query GetUser() {
      user { id
    }
  `

  executeGraphQLQuery(page, {
    query: INVALID_QUERY,
  })

  // Await the console message, because you cannot await a failed response.
  await sleep(500)

  expect(consoleSpy.get('error')).toEqual(
    expect.arrayContaining([
      expect.stringContaining(
        'Failed to intercept a GraphQL request to "POST http://localhost:8080/graphql": cannot parse query. See the error message from the parser below.\n\nSyntax Error: Expected "$", found ")".',
      ),
    ]),
  )
})

test('bypasses seemingly compatible REST requests', async () => {
  const { page, makeUrl } = await createRuntime()

  const res = await executeGraphQLQuery(
    page,
    {
      query: 'favorite books',
    },
    {
      uri: makeUrl('/search'),
    },
  )

  const headers = res.headers()
  const body = await res.json()

  expect(res.status()).toBe(200)
  expect(headers).not.toHaveProperty('x-powered-by', 'msw')
  expect(body).toEqual({
    results: [1, 2, 3],
  })
})

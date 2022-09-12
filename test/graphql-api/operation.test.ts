import { HttpServer } from '@open-draft/test-server/http'
import { test, expect } from '../playwright.extend'
import { gql } from '../support/graphql'

const OPERATION_EXAMPLE = require.resolve('./operation.mocks.ts')

const server = new HttpServer((app) => {
  app.post('/search', (req, res) => {
    return res.json({ results: [1, 2, 3] })
  })
})

test.beforeAll(async () => {
  await server.listen()
})

test.afterAll(async () => {
  await server.close()
})

test('intercepts and mocks a GraphQL query', async ({
  loadExample,
  spyOnConsole,
  query,
}) => {
  const consoleSpy = spyOnConsole()
  await loadExample(OPERATION_EXAMPLE)

  const GET_USER_QUERY = gql`
    query GetUser($id: String!) {
      query
      variables
    }
  `

  const res = await query('/graphql', {
    query: GET_USER_QUERY,
    variables: {
      id: 'abc-123',
    },
  })
  const headers = await res.allHeaders()
  const body = await res.json()

  expect(res.status()).toBe(200)
  expect(headers).toHaveProperty('x-powered-by', 'msw')
  expect(body).toEqual({
    data: {
      query: GET_USER_QUERY,
      variables: {
        id: 'abc-123',
      },
    },
  })

  expect(consoleSpy.get('startGroupCollapsed')).toEqual(
    expect.arrayContaining([
      expect.stringMatching(/\[MSW\] \d{2}:\d{2}:\d{2} query GetUser 200 OK/),
    ]),
  )
})

test('intercepts and mocks an anonymous GraphQL query', async ({
  loadExample,
  spyOnConsole,
  query,
}) => {
  const consoleSpy = spyOnConsole()
  await loadExample(OPERATION_EXAMPLE)

  const ANONYMOUS_QUERY = gql`
    query {
      anonymousQuery {
        query
        variables
      }
    }
  `

  const res = await query('/graphql', {
    query: ANONYMOUS_QUERY,
    variables: {
      id: 'abc-123',
    },
  })

  expect(consoleSpy.get('warning')).toBeUndefined()

  expect(res.status()).toBe(200)

  const headers = await res.allHeaders()
  expect(headers).toHaveProperty('x-powered-by', 'msw')

  const body = await res.json()
  expect(body).toEqual({
    data: {
      query: ANONYMOUS_QUERY,
      variables: {
        id: 'abc-123',
      },
    },
  })

  expect(consoleSpy.get('startGroupCollapsed')).toEqual(
    expect.arrayContaining([
      expect.stringMatching(/\[MSW\] \d{2}:\d{2}:\d{2} anonymous query 200 OK/),
    ]),
  )
})

test('intercepts and mocks a GraphQL mutation', async ({
  loadExample,
  query,
}) => {
  await loadExample(OPERATION_EXAMPLE)

  const LOGIN_MUTATION = gql`
    mutation Login($username: String!, $password: String!) {
      mutation
      variables
    }
  `

  const res = await query('/graphql', {
    query: LOGIN_MUTATION,
    variables: {
      username: 'john',
      password: 'super-secret',
    },
  })
  const headers = await res.allHeaders()
  const body = await res.json()

  expect(res.status()).toBe(200)
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

test('propagates parsing errors from the invalid GraphQL requests', async ({
  loadExample,
  spyOnConsole,
  query,
  waitFor,
}) => {
  const consoleSpy = spyOnConsole()
  await loadExample(OPERATION_EXAMPLE)

  const INVALID_QUERY = `
    # Intentionally invalid GraphQL query.
    query GetUser() {
      user { id
    }
  `

  query('/graphql', {
    query: INVALID_QUERY,
  })

  await waitFor(() => {
    expect(consoleSpy.get('error')).toEqual(
      expect.arrayContaining([
        expect.stringContaining(
          'Failed to intercept a GraphQL request to "POST http://localhost:8080/graphql": cannot parse query. See the error message from the parser below.\n\nSyntax Error: Expected "$", found ")".',
        ),
      ]),
    )
  })
})

test('bypasses seemingly compatible REST requests', async ({
  loadExample,
  query,
}) => {
  await loadExample(OPERATION_EXAMPLE)

  const res = await query(server.http.url('/search'), {
    query: 'favorite books',
  })

  const headers = await res.allHeaders()
  const body = await res.json()

  expect(res.status()).toBe(200)
  expect(headers).not.toHaveProperty('x-powered-by', 'msw')
  expect(body).toEqual({
    results: [1, 2, 3],
  })
})

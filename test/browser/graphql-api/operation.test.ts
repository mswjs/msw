import { HttpServer } from '@open-draft/test-server/lib/http.js'
import { test, expect } from '../playwright.extend'

const EXAMPLE_PATH = new URL('./operation.mocks.ts', import.meta.url)

const server = new HttpServer((app) => {
  app.post('/search', (req, res) => {
    return res.json({ results: [1, 2, 3] })
  })
})

test.beforeEach(async () => {
  await server.listen()
})

test.afterEach(async () => {
  await server.close()
})

test('intercepts and mocks a GraphQL query', async ({
  loadExample,
  spyOnConsole,
  query,
}) => {
  const consoleSpy = spyOnConsole()
  await loadExample(EXAMPLE_PATH)

  const GET_USER_QUERY = /* GraphQL */ `
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
  const body = await res.json()

  expect(res.status()).toBe(200)
  expect(res.fromServiceWorker()).toBe(true)
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
  await loadExample(EXAMPLE_PATH)

  const ANONYMOUS_QUERY = /* GraphQL */ `
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
  expect(res.fromServiceWorker()).toBe(true)

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
  await loadExample(EXAMPLE_PATH)

  const LOGIN_MUTATION = /* GraphQL */ `
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
  const body = await res.json()

  expect(res.status()).toBe(200)
  expect(res.fromServiceWorker()).toBe(true)
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
  await loadExample(EXAMPLE_PATH)

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
  await loadExample(EXAMPLE_PATH)

  const res = await query(server.http.url('/search'), {
    query: 'favorite books',
  })
  const body = await res.json()

  expect(res.status()).toBe(200)
  expect(res.fromServiceWorker()).toBe(true)
  expect(body).toEqual({
    results: [1, 2, 3],
  })
})

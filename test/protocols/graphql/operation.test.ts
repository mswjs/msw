import { HttpResponse } from 'msw'
import { graphql } from 'msw/graphql'
import { defineNetwork, expect } from '../../setup/vitest-helpers'
import { gql } from '../../support/graphql'

const api = graphql.link('*')

const handlers = [
  api.operation(async ({ query, variables }) => {
    return HttpResponse.json({
      data: {
        query,
        variables,
      },
    })
  }),
]

const test = defineNetwork({ handlers })

test('intercepts and mocks a GraphQL query', async ({
  spyOnConsole,
  query,
  task,
}) => {
  const consoleSpy = spyOnConsole()

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

  if (task.file.projectName === 'browser') {
    await expect
      .poll(() => consoleSpy.get('startGroupCollapsed'))
      .toEqual(
        expect.arrayContaining([
          expect.stringMatching(
            /\[MSW\] \d{2}:\d{2}:\d{2} query GetUser 200 OK/,
          ),
        ]),
      )
  }
})

test('intercepts and mocks an anonymous GraphQL query', async ({
  spyOnConsole,
  query,
  task,
}) => {
  const consoleSpy = spyOnConsole()

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

  if (task.file.projectName === 'browser') {
    await expect
      .poll(() => consoleSpy.get('startGroupCollapsed'))
      .toEqual(
        expect.arrayContaining([
          expect.stringMatching(
            /\[MSW\] \d{2}:\d{2}:\d{2} anonymous query 200 OK/,
          ),
        ]),
      )
  }
})

test('intercepts and mocks a GraphQL mutation', async ({ query }) => {
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
  spyOnConsole,
  query,
  task,
  testServer,
}) => {
  const consoleSpy = spyOnConsole()

  const INVALID_QUERY = `
    # Intentionally invalid GraphQL query.
    query GetUser() {
      user { id
    }
  `

  query('/graphql', {
    query: INVALID_QUERY,
  })

  const requestUrl =
    task.file.projectName === 'browser'
      ? '/graphql'
      : testServer.http.url('/graphql').href

  await expect
    .poll(() => consoleSpy.get('error'))
    .toEqual(
      expect.arrayContaining([
        expect.stringContaining(
          `Failed to intercept a GraphQL request to "POST ${requestUrl}": cannot parse query. See the error message from the parser below.\n\nSyntax Error: Expected "$", found ")".`,
        ),
      ]),
    )
})

test('bypasses seemingly compatible REST requests', async ({
  query,
  testServer,
}) => {
  const res = await query(testServer.http.url('/search'), {
    query: 'favorite books',
  })
  const body = await res.json()

  expect(res.status()).toBe(200)
  expect(res.fromServiceWorker()).toBe(true)
  expect(body).toEqual({
    results: [1, 2, 3],
  })
})

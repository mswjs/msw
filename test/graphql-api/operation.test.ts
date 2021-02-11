import * as path from 'path'
import { pageWith } from 'page-with'
import { executeGraphQLQuery } from './utils/executeGraphQLQuery'

function createRuntime() {
  return pageWith({
    example: path.resolve(__dirname, 'operation.mocks.ts'),
  })
}

test('matches GraphQL queries', async () => {
  const runtime = await createRuntime()
  const GET_USER_QUERY = `
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
})

test('matches GraphQL mutations', async () => {
  const runtime = await createRuntime()
  const LOGIN_MUTATION = `
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

test('matches only valid GraphQL requests', async () => {
  const runtime = await createRuntime()
  const res = await executeGraphQLQuery(runtime.page, {
    query: 'test',
  })

  const headers = res.headers()
  const body = await res.json()

  expect(res.status()).not.toEqual(200)
  expect(headers).not.toHaveProperty('x-powered-by', 'msw')
  expect(body).not.toEqual({
    data: {
      query: 'test',
    },
  })
})

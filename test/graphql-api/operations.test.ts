import * as path from 'path'
import { TestAPI, runBrowserWith } from '../support/runBrowserWith'
import { executeOperation } from './utils/executeOperation'

let runtime: TestAPI

beforeAll(async () => {
  runtime = await runBrowserWith(path.resolve(__dirname, 'operations.mocks.ts'))
})

afterAll(() => runtime.cleanup())

test('.operations() matches for GraphQL queries', async () => {
  const GET_USER_QUERY = `
    query GetUser($id: String!) {
      query
      variables
    }
  `

  const res = await executeOperation(runtime.page, {
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

test('.operations() matches for GraphQL mutations', async () => {
  const LOGIN_MUTATION = `
    mutation Login($username: String!, $password: String!) {
      mutation
      variables
    }
  `

  const res = await executeOperation(runtime.page, {
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

test('.operations() does not match non-GraphQL requests', async () => {
  const res = await executeOperation(runtime.page, {
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

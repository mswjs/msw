import * as path from 'path'
import { runBrowserWith, TestAPI } from '../support/runBrowserWith'
import { executeOperation } from './utils/executeOperation'

function createRuntime() {
  return runBrowserWith(path.resolve(__dirname, 'operation-reference.mocks.ts'))
}

let runtime: TestAPI

beforeAll(async () => {
  runtime = await createRuntime()
})
afterAll(async () => {
  await runtime.cleanup()
})

test('allows referencing the request body in the request handler', async () => {
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

test('allows referencing the request body in the request handler', async () => {
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

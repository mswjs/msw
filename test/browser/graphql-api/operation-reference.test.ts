import { test, expect } from '../playwright.extend'

const OPERATION_REFERENCE_EXAMPLE = new URL(
  './operation-reference.mocks.ts',
  import.meta.url,
)

test('allows referencing the request body in the GraphQL query handler', async ({
  loadExample,
  query,
}) => {
  await loadExample(OPERATION_REFERENCE_EXAMPLE)

  const GET_USER_QUERY = `
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
})

test('allows referencing the request body in the GraphQL mutation handler', async ({
  loadExample,
  query,
}) => {
  await loadExample(OPERATION_REFERENCE_EXAMPLE)

  const LOGIN_MUTATION = `
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

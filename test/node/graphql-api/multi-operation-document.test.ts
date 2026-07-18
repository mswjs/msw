// @vitest-environment node
import { HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { graphql } from 'msw/graphql'
import { gql } from '../../support/graphql'

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

/**
 * A document bundling multiple operations, like the ones emitted
 * by GraphQL Code Generator.
 */
const DOCUMENT = gql`
  query GetUser {
    user {
      id
    }
  }

  mutation UpdateUser {
    updateUser {
      id
    }
  }
`

it('selects the operation by name for a POST request', async () => {
  const queryResolver = vi.fn()

  server.use(
    graphql.query('GetUser', queryResolver),
    graphql.mutation('UpdateUser', () => {
      return HttpResponse.json({ data: { updateUser: { id: '1' } } })
    }),
  )

  const response = await fetch('http://localhost/graphql', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      query: DOCUMENT,
      operationName: 'UpdateUser',
    }),
  })

  await expect(response.json()).resolves.toEqual({
    data: { updateUser: { id: '1' } },
  })

  // The leading "GetUser" query must not intercept a request
  // that explicitly asks for the "UpdateUser" mutation.
  expect(queryResolver).not.toHaveBeenCalled()
})

it('selects the operation by name for a GET request', async () => {
  const queryResolver = vi.fn()

  server.use(
    graphql.query('GetUser', queryResolver),
    graphql.mutation('UpdateUser', () => {
      return HttpResponse.json({ data: { updateUser: { id: '1' } } })
    }),
  )

  const url = new URL('http://localhost/graphql')
  url.searchParams.set('query', DOCUMENT)
  url.searchParams.set('operationName', 'UpdateUser')

  const response = await fetch(url)

  await expect(response.json()).resolves.toEqual({
    data: { updateUser: { id: '1' } },
  })
  expect(queryResolver).not.toHaveBeenCalled()
})

it('selects the operation by name for a multipart request', async () => {
  const queryResolver = vi.fn()

  server.use(
    graphql.query('GetUser', queryResolver),
    graphql.mutation('UpdateUser', () => {
      return HttpResponse.json({ data: { updateUser: { id: '1' } } })
    }),
  )

  const formData = new FormData()
  formData.set(
    'operations',
    JSON.stringify({
      query: DOCUMENT,
      operationName: 'UpdateUser',
      variables: {},
    }),
  )
  formData.set('map', JSON.stringify({}))

  const response = await fetch('http://localhost/graphql', {
    method: 'POST',
    body: formData,
  })

  await expect(response.json()).resolves.toEqual({
    data: { updateUser: { id: '1' } },
  })
  expect(queryResolver).not.toHaveBeenCalled()
})

it('does not match any handler given an unknown operation name', async () => {
  const queryResolver = vi.fn()
  const mutationResolver = vi.fn()

  server.use(
    graphql.query('GetUser', queryResolver),
    graphql.mutation('UpdateUser', mutationResolver),
  )

  const response = await fetch('http://localhost/graphql', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      query: DOCUMENT,
      operationName: 'Unknown',
    }),
  }).catch((error) => error)

  // Resolving the leading operation would mock an operation the
  // client never asked for.
  expect(queryResolver).not.toHaveBeenCalled()
  expect(mutationResolver).not.toHaveBeenCalled()
  expect(response).toBeInstanceOf(Error)
})

// @vitest-environment node
import { HttpResponse } from 'msw'
import { graphql } from 'msw/graphql'
import { setupServer } from 'msw/node'
import { createGraphQLClient } from '../../support/graphql'

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

it('responds with the "application/json" content type by default', async () => {
  server.use(
    graphql.query('GetUser', () => {
      return HttpResponse.json({
        data: { user: { name: 'John Maverick' } },
      })
    }),
  )

  const client = createGraphQLClient({
    uri: 'http://any.host.here/irrelevant',
  })

  const result = await client({
    query: `
      query GetUser {
        user {
          name
        }
      }
    `,
  })

  expect
    .soft(result.response.headers.get('content-type'))
    .toBe('application/json')
  expect.soft(result.data).toEqual({ user: { name: 'John Maverick' } })
  expect.soft(result.errors).toBeUndefined()
})

it('responds with the "application/graphql-response+json" content type if the client accepts it', async () => {
  server.use(
    graphql.mutation('CreatePost', () => {
      return HttpResponse.json({
        data: { post: { id: 'abc-123' } },
      })
    }),
  )

  const client = createGraphQLClient({
    uri: 'http://any.host.here/irrelevant',
  })

  {
    const result = await client({
      query: `
        mutation CreatePost {
          post {
            id
          }
        }
    `,
      headers: {
        accept: 'application/graphql-response+json',
      },
    })

    expect
      .soft(
        result.response.headers.get('content-type'),
        'Supports the new accept type exclusively',
      )
      .toBe('application/graphql-response+json')
    expect.soft(result.data).toEqual({ post: { id: 'abc-123' } })
    expect.soft(result.errors).toBeUndefined()
  }

  {
    const result = await client({
      query: `
        mutation CreatePost {
          post {
            id
          }
        }
    `,
      headers: {
        accept: 'application/graphql-response+json, application/json;q=0.9',
      },
    })

    expect
      .soft(
        result.response.headers.get('content-type'),
        'Supports a mix of the new and old accept types',
      )
      .toBe('application/graphql-response+json')
    expect.soft(result.data).toEqual({ post: { id: 'abc-123' } })
    expect.soft(result.errors).toBeUndefined()
  }
})

it('respects the "Accept" request header quality', async () => {
  server.use(
    graphql.mutation('CreatePost', () => {
      return HttpResponse.json({
        data: { post: { id: 'abc-123' } },
      })
    }),
  )

  const client = createGraphQLClient({
    uri: 'http://any.host.here/irrelevant',
  })

  {
    const result = await client({
      query: `
        mutation CreatePost {
          post {
            id
          }
        }
    `,
      headers: {
        accept: ' application/graphql-response+json;q=0.5, application/json',
      },
    })

    expect
      .soft(result.response.headers.get('content-type'))
      .toBe('application/json')
    expect.soft(result.data).toEqual({ post: { id: 'abc-123' } })
    expect.soft(result.errors).toBeUndefined()
  }
})

it('responds with the "application/graphql-response+json" in generator responses', async () => {
  server.use(
    graphql.query('GetForecast', function* () {
      yield HttpResponse.json({
        data: { forecast: { degrees: 25 } },
      })
    }),
  )

  const client = createGraphQLClient({
    uri: 'http://any.host.here/irrelevant',
  })

  const result = await client({
    query: `
      query GetForecast {
        forecast {
          degrees
        }
      }
    `,
    headers: {
      accept: 'application/graphql-response+json',
    },
  })

  expect
    .soft(result.response.headers.get('content-type'))
    .toBe('application/graphql-response+json')
  expect.soft(result.data).toEqual({ forecast: { degrees: 25 } })
  expect.soft(result.errors).toBeUndefined()
})

it('ignores request "Accept" preferences if an explicit "content-type" is set on the mocked response', async () => {
  server.use(
    graphql.query('GetUser', () => {
      return HttpResponse.json(
        {
          data: { user: { name: 'John Maverick' } },
        },
        {
          headers: {
            // Simulating an old server that doesn't support the modern mime type.
            'content-type': 'application/json',
          },
        },
      )
    }),
  )

  const client = createGraphQLClient({
    uri: 'http://any.host.here/irrelevant',
  })

  const result = await client({
    query: `
      query GetUser {
        user {
          name
        }
      }
    `,
    headers: {
      accept: 'application/graphql-response+json',
    },
  })

  expect
    .soft(result.response.headers.get('content-type'))
    .toBe('application/json')
  expect.soft(result.data).toEqual({ user: { name: 'John Maverick' } })
  expect.soft(result.errors).toBeUndefined()
})

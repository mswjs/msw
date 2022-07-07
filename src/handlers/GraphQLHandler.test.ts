/**
 * @jest-environment jsdom
 */
import { OperationTypeNode, parse } from 'graphql'
import { Headers } from 'headers-polyfill/lib'
import { context, MockedRequest, MockedRequestInit } from '..'
import { response } from '../response'
import {
  GraphQLContext,
  GraphQLHandler,
  GraphQLRequest,
  GraphQLRequestBody,
  isDocumentNode,
} from './GraphQLHandler'
import { ResponseResolver } from './RequestHandler'

const resolver: ResponseResolver<
  GraphQLRequest<{ userId: string }>,
  GraphQLContext<any>
> = (req, res, ctx) => {
  return res(
    ctx.data({
      user: { id: req.variables.userId },
    }),
  )
}

function createGetGraphQLRequest(
  body: GraphQLRequestBody<any>,
  hostname = 'https://example.com',
) {
  const requestUrl = new URL(hostname)
  requestUrl.searchParams.set('query', body?.query)
  requestUrl.searchParams.set('variables', JSON.stringify(body?.variables))
  return new MockedRequest(requestUrl)
}

function createPostGraphQLRequest(
  body: GraphQLRequestBody<any>,
  hostname = 'https://example.com',
  requestInit: MockedRequestInit = {},
) {
  return new MockedRequest(new URL(hostname), {
    method: 'POST',
    ...requestInit,
    headers: new Headers({ 'Content-Type': 'application/json' }),
    body,
  })
}

const GET_USER = `
  query GetUser {
    user {
      id
    }
  }
`

const LOGIN = `
  mutation Login {
    user {
      id
    }
  }
`

describe('info', () => {
  test('exposes request handler information for query', () => {
    const handler = new GraphQLHandler(
      OperationTypeNode.QUERY,
      'GetUser',
      '*',
      resolver,
    )

    expect(handler.info.header).toEqual('query GetUser (origin: *)')
    expect(handler.info.operationType).toEqual('query')
    expect(handler.info.operationName).toEqual('GetUser')
  })

  test('exposes request handler information for mutation', () => {
    const handler = new GraphQLHandler(
      OperationTypeNode.MUTATION,
      'Login',
      '*',
      resolver,
    )

    expect(handler.info.header).toEqual('mutation Login (origin: *)')
    expect(handler.info.operationType).toEqual('mutation')
    expect(handler.info.operationName).toEqual('Login')
  })

  test('parses a query operation name from a given DocumentNode', () => {
    const node = parse(`
      query GetUser {
        user {
          firstName
        }
      }
    `)

    const handler = new GraphQLHandler(
      OperationTypeNode.QUERY,
      node,
      '*',
      resolver,
    )

    expect(handler.info).toHaveProperty('header', 'query GetUser (origin: *)')
    expect(handler.info).toHaveProperty('operationType', 'query')
    expect(handler.info).toHaveProperty('operationName', 'GetUser')
  })

  test('parses a mutation operation name from a given DocumentNode', () => {
    const node = parse(`
      mutation Login {
        user {
          id
        }
      }
    `)
    const handler = new GraphQLHandler(
      OperationTypeNode.MUTATION,
      node,
      '*',
      resolver,
    )

    expect(handler.info).toHaveProperty('header', 'mutation Login (origin: *)')
    expect(handler.info).toHaveProperty('operationType', 'mutation')
    expect(handler.info).toHaveProperty('operationName', 'Login')
  })

  test('throws an exception given a DocumentNode with a mismatched operation type', () => {
    const node = parse(`
      mutation CreateUser {
        user {
          firstName
        }
      }
    `)

    expect(
      () => new GraphQLHandler(OperationTypeNode.QUERY, node, '*', resolver),
    ).toThrow(
      'Failed to create a GraphQL handler: provided a DocumentNode with a mismatched operation type (expected "query", but got "mutation").',
    )
  })
})

describe('parse', () => {
  describe('query', () => {
    test('parses a query without variables (GET)', () => {
      const handler = new GraphQLHandler(
        OperationTypeNode.QUERY,
        'GetUser',
        '*',
        resolver,
      )
      const request = createGetGraphQLRequest({
        query: GET_USER,
      })

      expect(handler.parse(request)).toEqual({
        operationType: 'query',
        operationName: 'GetUser',
        variables: undefined,
      })
    })

    test('parses a query with variables (GET)', () => {
      const handler = new GraphQLHandler(
        OperationTypeNode.QUERY,
        'GetUser',
        '*',
        resolver,
      )
      const request = createGetGraphQLRequest({
        query: GET_USER,
        variables: {
          userId: 'abc-123',
        },
      })

      expect(handler.parse(request)).toEqual({
        operationType: 'query',
        operationName: 'GetUser',
        variables: {
          userId: 'abc-123',
        },
      })
    })

    test('parses a query without variables (POST)', () => {
      const handler = new GraphQLHandler(
        OperationTypeNode.QUERY,
        'GetUser',
        '*',
        resolver,
      )
      const request = createPostGraphQLRequest({
        query: GET_USER,
      })

      expect(handler.parse(request)).toEqual({
        operationType: 'query',
        operationName: 'GetUser',
        variables: undefined,
      })
    })

    test('parses a query with variables (POST)', () => {
      const handler = new GraphQLHandler(
        OperationTypeNode.QUERY,
        'GetUser',
        '*',
        resolver,
      )
      const request = createPostGraphQLRequest({
        query: GET_USER,
        variables: {
          userId: 'abc-123',
        },
      })

      expect(handler.parse(request)).toEqual({
        operationType: 'query',
        operationName: 'GetUser',
        variables: {
          userId: 'abc-123',
        },
      })
    })
  })

  describe('mutation', () => {
    test('parses a mutation without variables (GET)', () => {
      const handler = new GraphQLHandler(
        OperationTypeNode.MUTATION,
        'GetUser',
        '*',
        resolver,
      )
      const request = createGetGraphQLRequest({
        query: LOGIN,
      })

      expect(handler.parse(request)).toEqual({
        operationType: 'mutation',
        operationName: 'Login',
        variables: undefined,
      })
    })

    test('parses a mutation with variables (GET)', () => {
      const handler = new GraphQLHandler(
        OperationTypeNode.MUTATION,
        'GetUser',
        '*',
        resolver,
      )
      const request = createGetGraphQLRequest({
        query: LOGIN,
        variables: {
          userId: 'abc-123',
        },
      })

      expect(handler.parse(request)).toEqual({
        operationType: 'mutation',
        operationName: 'Login',
        variables: {
          userId: 'abc-123',
        },
      })
    })

    test('parses a mutation without variables (POST)', () => {
      const handler = new GraphQLHandler(
        OperationTypeNode.MUTATION,
        'GetUser',
        '*',
        resolver,
      )
      const request = createPostGraphQLRequest({
        query: LOGIN,
      })

      expect(handler.parse(request)).toEqual({
        operationType: 'mutation',
        operationName: 'Login',
        variables: undefined,
      })
    })

    test('parses a mutation with variables (POST)', () => {
      const handler = new GraphQLHandler(
        OperationTypeNode.MUTATION,
        'GetUser',
        '*',
        resolver,
      )
      const request = createPostGraphQLRequest({
        query: LOGIN,
        variables: {
          userId: 'abc-123',
        },
      })

      expect(handler.parse(request)).toEqual({
        operationType: 'mutation',
        operationName: 'Login',
        variables: {
          userId: 'abc-123',
        },
      })
    })
  })
})

describe('predicate', () => {
  test('respects operation type', () => {
    const handler = new GraphQLHandler(
      OperationTypeNode.QUERY,
      'GetUser',
      '*',
      resolver,
    )
    const request = createPostGraphQLRequest({
      query: GET_USER,
    })
    const alienRequest = createPostGraphQLRequest({
      query: LOGIN,
    })

    expect(handler.predicate(request, handler.parse(request))).toBe(true)
    expect(handler.predicate(alienRequest, handler.parse(alienRequest))).toBe(
      false,
    )
  })

  test('respects operation name', () => {
    const handler = new GraphQLHandler(
      OperationTypeNode.QUERY,
      'GetUser',
      '*',
      resolver,
    )
    const request = createPostGraphQLRequest({
      query: GET_USER,
    })
    const alienRequest = createPostGraphQLRequest({
      query: `
          query GetAllUsers {
            user {
              id
            }
          }
        `,
    })

    expect(handler.predicate(request, handler.parse(request))).toBe(true)
    expect(handler.predicate(alienRequest, handler.parse(alienRequest))).toBe(
      false,
    )
  })

  test('allows anonymous GraphQL opertaions when using "all" expected operation type', () => {
    const handler = new GraphQLHandler('all', new RegExp('.*'), '*', resolver)
    const request = createPostGraphQLRequest({
      query: `
        query {
          anonymousQuery {
            query
            variables
          }
        }
      `,
    })

    expect(handler.predicate(request, handler.parse(request))).toBe(true)
  })

  test('respects custom endpoint', () => {
    const handler = new GraphQLHandler(
      OperationTypeNode.QUERY,
      'GetUser',
      'https://api.github.com/graphql',
      resolver,
    )
    const request = createPostGraphQLRequest(
      {
        query: GET_USER,
      },
      'https://api.github.com/graphql',
    )
    const alienRequest = createPostGraphQLRequest({
      query: GET_USER,
    })

    expect(handler.predicate(request, handler.parse(request))).toBe(true)
    expect(handler.predicate(alienRequest, handler.parse(alienRequest))).toBe(
      false,
    )
  })
})

describe('test', () => {
  test('respects operation type', () => {
    const handler = new GraphQLHandler(
      OperationTypeNode.QUERY,
      'GetUser',
      '*',
      resolver,
    )
    const request = createPostGraphQLRequest({
      query: GET_USER,
    })
    const alienRequest = createPostGraphQLRequest({
      query: LOGIN,
    })

    expect(handler.test(request)).toBe(true)
    expect(handler.test(alienRequest)).toBe(false)
  })

  test('respects operation name', () => {
    const handler = new GraphQLHandler(
      OperationTypeNode.QUERY,
      'GetUser',
      '*',
      resolver,
    )
    const request = createPostGraphQLRequest({
      query: GET_USER,
    })
    const alienRequest = createPostGraphQLRequest({
      query: `
          query GetAllUsers {
            user {
              id
            }
          }
        `,
    })

    expect(handler.test(request)).toBe(true)
    expect(handler.test(alienRequest)).toBe(false)
  })

  test('respects custom endpoint', () => {
    const handler = new GraphQLHandler(
      OperationTypeNode.QUERY,
      'GetUser',
      'https://api.github.com/graphql',
      resolver,
    )
    const request = createPostGraphQLRequest(
      {
        query: GET_USER,
      },
      'https://api.github.com/graphql',
    )
    const alienRequest = createPostGraphQLRequest({
      query: GET_USER,
    })

    expect(handler.test(request)).toBe(true)
    expect(handler.test(alienRequest)).toBe(false)
  })
})

describe('run', () => {
  test('returns a mocked response given a matching query', async () => {
    const handler = new GraphQLHandler(
      OperationTypeNode.QUERY,
      'GetUser',
      '*',
      resolver,
    )
    const request = createPostGraphQLRequest({
      query: GET_USER,
      variables: {
        userId: 'abc-123',
      },
    })
    const result = await handler.run(request)

    expect(result).toEqual({
      handler,
      request: {
        ...request,
        variables: {
          userId: 'abc-123',
        },
      },
      parsedResult: {
        operationType: 'query',
        operationName: 'GetUser',
        variables: {
          userId: 'abc-123',
        },
      },
      response: await response(
        context.data({
          user: { id: 'abc-123' },
        }),
      ),
    })
  })

  test('returns null given a non-matching query', async () => {
    const handler = new GraphQLHandler(
      OperationTypeNode.QUERY,
      'GetUser',
      '*',
      resolver,
    )
    const request = createPostGraphQLRequest({
      query: LOGIN,
    })
    const result = await handler.run(request)

    expect(result).toBeNull()
  })
})

describe('isDocumentNode', () => {
  it('returns true given a valid DocumentNode', () => {
    const node = parse(`
      query GetUser {
        user {
          login
        }
      }
    `)

    expect(isDocumentNode(node)).toEqual(true)
  })

  it('returns false given an arbitrary input', () => {
    expect(isDocumentNode(null)).toEqual(false)
    expect(isDocumentNode(undefined)).toEqual(false)
    expect(isDocumentNode('')).toEqual(false)
    expect(isDocumentNode('value')).toEqual(false)
    expect(isDocumentNode(/value/)).toEqual(false)
  })
})

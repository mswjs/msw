/**
 * @jest-environment jsdom
 */
import { encodeBuffer } from '@mswjs/interceptors'
import { OperationTypeNode, parse } from 'graphql'
import { Headers } from 'headers-polyfill'
import {
  GraphQLContext,
  GraphQLHandler,
  GraphQLRequestBody,
  GraphQLResolverExtras,
  isDocumentNode,
} from './GraphQLHandler'
import { HttpResponse } from '../utils/HttpResponse'
import { ResponseResolver } from './RequestHandler'
import { Request } from '../fetch'

const resolver: ResponseResolver<
  GraphQLContext<any>,
  GraphQLResolverExtras<{ userId: string }>
> = ({ variables }) => {
  return HttpResponse.json({
    data: {
      user: {
        id: variables.userId,
      },
    },
  })
}

function createGetGraphQLRequest(
  body: GraphQLRequestBody<any>,
  hostname = 'https://example.com',
) {
  const requestUrl = new URL(hostname)
  requestUrl.searchParams.set('query', body?.query)
  requestUrl.searchParams.set('variables', JSON.stringify(body?.variables))
  return new Request(requestUrl)
}

function createPostGraphQLRequest(
  body: GraphQLRequestBody<any>,
  hostname = 'https://example.com',
) {
  return new Request(new URL(hostname), {
    method: 'POST',
    headers: new Headers({ 'Content-Type': 'application/json' }),
    body: encodeBuffer(JSON.stringify(body)),
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
    test('parses a query without variables (GET)', async () => {
      const handler = new GraphQLHandler(
        OperationTypeNode.QUERY,
        'GetUser',
        '*',
        resolver,
      )
      const request = createGetGraphQLRequest({
        query: GET_USER,
      })

      expect(await handler.parse(request)).toEqual({
        operationType: 'query',
        operationName: 'GetUser',
        query: GET_USER,
        variables: undefined,
      })
    })

    test('parses a query with variables (GET)', async () => {
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

      expect(await handler.parse(request)).toEqual({
        operationType: 'query',
        operationName: 'GetUser',
        query: GET_USER,
        variables: {
          userId: 'abc-123',
        },
      })
    })

    test('parses a query without variables (POST)', async () => {
      const handler = new GraphQLHandler(
        OperationTypeNode.QUERY,
        'GetUser',
        '*',
        resolver,
      )
      const request = createPostGraphQLRequest({
        query: GET_USER,
      })

      expect(await handler.parse(request)).toEqual({
        operationType: 'query',
        operationName: 'GetUser',
        query: GET_USER,
        variables: undefined,
      })
    })

    test('parses a query with variables (POST)', async () => {
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

      expect(await handler.parse(request)).toEqual({
        operationType: 'query',
        operationName: 'GetUser',
        query: GET_USER,
        variables: {
          userId: 'abc-123',
        },
      })
    })
  })

  describe('mutation', () => {
    test('parses a mutation without variables (GET)', async () => {
      const handler = new GraphQLHandler(
        OperationTypeNode.MUTATION,
        'GetUser',
        '*',
        resolver,
      )
      const request = createGetGraphQLRequest({
        query: LOGIN,
      })

      expect(await handler.parse(request)).toEqual({
        operationType: 'mutation',
        operationName: 'Login',
        query: LOGIN,
        variables: undefined,
      })
    })

    test('parses a mutation with variables (GET)', async () => {
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

      expect(await handler.parse(request)).toEqual({
        operationType: 'mutation',
        operationName: 'Login',
        query: LOGIN,
        variables: {
          userId: 'abc-123',
        },
      })
    })

    test('parses a mutation without variables (POST)', async () => {
      const handler = new GraphQLHandler(
        OperationTypeNode.MUTATION,
        'GetUser',
        '*',
        resolver,
      )
      const request = createPostGraphQLRequest({
        query: LOGIN,
      })

      expect(await handler.parse(request)).toEqual({
        operationType: 'mutation',
        operationName: 'Login',
        query: LOGIN,
        variables: undefined,
      })
    })

    test('parses a mutation with variables (POST)', async () => {
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

      expect(await handler.parse(request)).toEqual({
        operationType: 'mutation',
        operationName: 'Login',
        query: LOGIN,
        variables: {
          userId: 'abc-123',
        },
      })
    })
  })
})

describe('predicate', () => {
  test('respects operation type', async () => {
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

    expect(handler.predicate(request, await handler.parse(request))).toBe(true)
    expect(
      handler.predicate(alienRequest, await handler.parse(alienRequest)),
    ).toBe(false)
  })

  test('respects operation name', async () => {
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

    expect(handler.predicate(request, await handler.parse(request))).toBe(true)
    expect(
      handler.predicate(alienRequest, await handler.parse(alienRequest)),
    ).toBe(false)
  })

  test('allows anonymous GraphQL opertaions when using "all" expected operation type', async () => {
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

    expect(handler.predicate(request, await handler.parse(request))).toBe(true)
  })

  test('respects custom endpoint', async () => {
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

    expect(handler.predicate(request, await handler.parse(request))).toBe(true)
    expect(
      handler.predicate(alienRequest, await handler.parse(alienRequest)),
    ).toBe(false)
  })
})

describe('test', () => {
  test('respects operation type', async () => {
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

    expect(await handler.test(request)).toBe(true)
    expect(await handler.test(alienRequest)).toBe(false)
  })

  test('respects operation name', async () => {
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

    expect(await handler.test(request)).toBe(true)
    expect(await handler.test(alienRequest)).toBe(false)
  })

  test('respects custom endpoint', async () => {
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

    expect(await handler.test(request)).toBe(true)
    expect(await handler.test(alienRequest)).toBe(false)
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

    expect(result).toMatchObject({
      handler,
      request,
      parsedResult: {
        operationType: 'query',
        operationName: 'GetUser',
        variables: {
          userId: 'abc-123',
        },
      },
      response: HttpResponse.json({
        data: {
          user: {
            id: 'abc-123',
          },
        },
      }),
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

import { Page, Response } from 'puppeteer'
import { Override } from '../../../src/tsHelpers'

export const HOSTNAME = 'http://localhost:8080/graphql'

/**
 * Standalone GraphQL operations dispatcher.
 */
export const graphqlOperation = (url: string) => {
  return (query: string) => {
    return fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
      }),
    })
  }
}

interface GraphQLRequestPayload {
  query: string
  variables?: Record<string, any>
}

interface GraphQLOperationOptions {
  uri?: string
  method?: 'GET' | 'POST'
}

/**
 * Helper to perform the request
 */
function performRequest({ page, urlString, method, payload }) {
  const responsePromise = page.evaluate(
    (url, method, query, variables) => {
      return fetch(
        url,
        Object.assign(
          {},
          method === 'POST' && {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              query,
              variables,
            }),
          },
        ),
      )
    },
    urlString,
    method,
    payload.query,
    payload.variables,
  )

  return new Promise<Response>((resolve, reject) => {
    // Propagate `fetch` exceptions to the parent Promise.
    responsePromise.catch(reject)

    return page.waitForResponse(urlString).then(resolve)
  })
}

/**
 * Executes a GraphQL operation in the given Puppeteer context.
 */
export const executeOperation = async (
  page: Page,
  payload: GraphQLRequestPayload,
  options?: GraphQLOperationOptions,
) => {
  const { uri = HOSTNAME, method = 'POST' } = options || {}
  const { query, variables } = payload
  const url = new URL(uri)

  if (method === 'GET') {
    url.searchParams.set('query', query)

    if (variables) {
      url.searchParams.set('variables', JSON.stringify(variables))
    }
  }

  const urlString = url.toString()

  return performRequest({
    urlString,
    method,
    payload: { query, variables },
    page,
  })
}

/**
 * Executes a GraphQL batch operation in the given Puppeteer context.
 */
export const executeBatchOperation = async (
  page: Page,
  payload: GraphQLRequestPayload[],
  options?: Override<GraphQLOperationOptions, { method: 'POST' }>,
) => {
  const { uri = HOSTNAME, method = 'POST' } = options || {}
  const url = new URL(uri)
  const urlString = url.toString()

  const results = await Promise.all(
    payload.map(({ query, variables }) =>
      performRequest({
        page,
        urlString,
        method,
        payload: { query, variables },
      }),
    ),
  )

  return { data: Object.values(results) }
}

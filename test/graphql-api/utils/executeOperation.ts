import { Page } from 'puppeteer'

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
  variables?: Record<string, string>
}

/**
 * Executes a GraphQL operation in the given Puppeteer context.
 */
export const executeOperation = async (
  page: Page,
  payload: GraphQLRequestPayload,
) => {
  page.evaluate(
    (url, query, variables) => {
      fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query,
          variables,
        }),
      })
    },
    HOSTNAME,
    payload.query,
    payload.variables,
  )

  return page.waitForResponse(HOSTNAME)
}

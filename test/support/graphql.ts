import type { ExecutionResult } from 'graphql'

/**
 * Identity function that returns a given template string array.
 * Provides GraphQL syntax highlighting without any extra transformations.
 */
export const gql = (str: TemplateStringsArray) => {
  return str.join('')
}

interface GraphQLClientOPtions {
  uri: string
  fetch?: (input: any, init?: any) => Promise<Response>
}

interface GraphQLOperationInput {
  query: TemplateStringsArray | string
  variables?: Record<string, any>
}

/**
 * Create a new GraphQL client. Uses `fetch` to dispatch a
 * specification-compliant GraphQL request.
 */
export function createGraphQLClient(options: GraphQLClientOPtions) {
  const fetchFn = options.fetch || fetch

  return async <Data extends Record<string, unknown>>(
    input: GraphQLOperationInput,
  ): Promise<ExecutionResult<Data>> => {
    const response = await fetchFn(options.uri, {
      method: 'POST',
      headers: {
        accept: '*/*',
        'content-type': 'application/json',
      },
      body: JSON.stringify(input),
    })

    // No need to transform the JSON into `ExecutionResult`,
    // because that's the responsibility of an actual server
    // or an MSW request handler.
    return response.json()
  }
}

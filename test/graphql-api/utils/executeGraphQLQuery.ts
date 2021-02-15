import { Page, Response } from 'page-with'

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
  map?: Record<string, string[]>
  fileContents?: string[]
}

/**
 * Executes a GraphQL operation in the given Playwright context.
 */
export const executeGraphQLQuery = async (
  page: Page,
  payload: GraphQLRequestPayload,
  options?: GraphQLOperationOptions,
) => {
  const { uri = HOSTNAME, method = 'POST', map, fileContents } = options || {}
  const { query, variables } = payload
  const url = new URL(uri)

  if (method === 'GET') {
    url.searchParams.set('query', query)

    if (variables) {
      url.searchParams.set('variables', JSON.stringify(variables))
    }
  }

  const urlString = url.toString()

  // Cannot pass files because of Playwright's limitation.
  const responsePromise = page.evaluate<
    globalThis.Response,
    [
      string,
      string,
      GraphQLRequestPayload['query'],
      GraphQLRequestPayload['variables'],
      GraphQLOperationOptions['map'],
      GraphQLOperationOptions['fileContents'],
    ]
  >(
    ([url, method, query, variables, map, fileContents]) => {
      const getMultipartGraphQLBody = (
        operations: string,
        map: Record<string, string[]>,
        fileContents: string[],
      ): FormData => {
        const body = new FormData()
        body.append('operations', operations)
        body.append('map', JSON.stringify(map))
        const files = fileContents.map((f, i) => new File([f], `file${i}.txt`))
        for (const [index, file] of files.entries()) {
          body.append(index.toString(), file)
        }
        return body
      }

      const operations = JSON.stringify({
        query,
        variables,
      })

      const isMultipartData = map && fileContents
      const headers = isMultipartData
        ? {}
        : { 'Content-Type': 'application/json' }
      const body = isMultipartData
        ? getMultipartGraphQLBody(operations, map, fileContents)
        : operations

      return fetch(
        url,
        Object.assign(
          {},
          method === 'POST' && {
            method: 'POST',
            headers,
            body,
          },
        ),
      ).catch(() => null)
    },
    [urlString, method, payload.query, payload.variables, map, fileContents],
  )

  return new Promise<Response>((resolve, reject) => {
    // Propagate `fetch` exceptions to the parent Promise.
    responsePromise.catch(reject)

    return page.waitForResponse(urlString).then(resolve).catch(resolve)
  })
}

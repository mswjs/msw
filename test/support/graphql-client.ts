import {
  createClient as createGraphQLClient,
  type Client,
  type ClientOptions,
} from 'graphql-ws'

export type DisposableGraphQLClient = Client & AsyncDisposable

/**
 * Create a GraphQL client that disposes of itself when it goes out
 * of scope. Prefer it over `createClient()` from "graphql-ws" so the
 * tests don't have to dispose of their clients explicitly.
 *
 * @example
 * await using client = createClient({ url })
 * // The client is disposed of once the test is done.
 */
export function createClient(options: ClientOptions): DisposableGraphQLClient {
  const client = createGraphQLClient(options)

  return Object.assign(client, {
    async [Symbol.asyncDispose](): Promise<void> {
      await client.dispose()
    },
  })
}

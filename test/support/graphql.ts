import * as React from 'react'
import {
  ApolloClient,
  InMemoryCache,
  createHttpLink,
  HttpOptions,
  gql,
} from '@apollo/client'

export function getClient(httpLinkOptions: HttpOptions) {
  return new ApolloClient({
    cache: new InMemoryCache(),
    link: createHttpLink(httpLinkOptions),
  })
}

export { gql }

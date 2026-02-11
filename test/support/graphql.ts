import { parse, type ExecutionResult } from 'graphql'
import {
  DocumentTypeDecoration,
  TypedDocumentNode,
} from '@graphql-typed-document-node/core'

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
  headers?: Record<string, string>
}

/**
 * Create a new GraphQL client. Uses `fetch` to dispatch a
 * specification-compliant GraphQL request.
 */
export function createGraphQLClient(options: GraphQLClientOPtions) {
  return async <Data extends Record<string, unknown>>(
    input: GraphQLOperationInput,
  ): Promise<ExecutionResult<Data> & { response: Response }> => {
    const response = await fetch(options.uri, {
      method: 'POST',
      headers: {
        accept: '*/*',
        'content-type': 'application/json',
        ...(input.headers || {}),
      },
      body: JSON.stringify(input),
    })

    // No need to transform the JSON into `ExecutionResult`,
    // because that's the responsibility of an actual server
    // or an MSW request handler.
    const { data, errors, extensions } = await response.json()

    return {
      data,
      errors,
      extensions,
      response,
    }
  }
}

export class TypedDocumentString<TResult, TVariables>
  extends String
  implements DocumentTypeDecoration<TResult, TVariables>
{
  __apiType?: DocumentTypeDecoration<TResult, TVariables>['__apiType']

  constructor(
    private value: string,
    public __meta__?: { hash: string },
  ) {
    super(value)
  }

  toString(): string & DocumentTypeDecoration<TResult, TVariables> {
    return this.value
  }
}

export function createTypedDocumentString<TResult = any, TVariables = any>(
  source: string,
) {
  return new TypedDocumentString<TResult, TVariables>(source)
}

export function createTypedDocumentNode<TResult = any, TVariables = any>(
  source: string,
): TypedDocumentNode<TResult, TVariables> {
  const doc = typeof source === 'string' ? parse(source) : source
  return doc as TypedDocumentNode<TResult, TVariables>
}

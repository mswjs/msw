import { graphql, HttpResponse } from 'msw'
import { DocumentTypeDecoration } from '@graphql-typed-document-node/core'

declare function createTypedDocumentString<TResult = any, TVariables = any>(
  query: string,
): DocumentTypeDecoration<TResult, TVariables>

it('infers the query type', () => {
  graphql.query(
    createTypedDocumentString<{ user: { id: string; name: string } }>(''),
    ({ query }) => {
      expectTypeOf(query).toBeString()

      return HttpResponse.json({
        data: { user: { id: '1', name: 'John Doe' } },
      })
    },
  )
})

it('infers the variables type', () => {
  graphql.query(
    createTypedDocumentString<null, { id: string }>(''),
    ({ variables }) => {
      expectTypeOf(variables).toEqualTypeOf<{ id: string }>()
    },
  )
})

import { graphql, HttpResponse } from 'msw'
import { DocumentTypeDecoration } from '@graphql-typed-document-node/core'

declare function createTypedDocumentString<TResult = any, TVariables = any>(
  query: string,
): DocumentTypeDecoration<TResult, TVariables>

it('infers the result type', () => {
  graphql.query(
    createTypedDocumentString<{ user: { id: string; name: string } }>(''),
    () => {
      if (Math.random()) {
        return HttpResponse.json({
          data: {
            user: {
              // @ts-expect-error Invalid result type.
              id: 123,
              name: 'John Doe',
            },
          },
        })
      }

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

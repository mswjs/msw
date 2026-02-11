import { graphql, HttpResponse } from 'msw'
import { TypedDocumentNode } from '@graphql-typed-document-node/core'

const GetUserQuery = {} as TypedDocumentNode<
  {
    user: {
      name: 'John'
    }
  },
  { userId: string }
>

it('infers the result type', () => {
  graphql.query(GetUserQuery, () => {
    if (Math.random()) {
      return HttpResponse.json({
        data: {
          user: {
            // @ts-expect-error Invalid result type.
            name: 123,
          },
        },
      })
    }

    return HttpResponse.json({
      data: {
        user: { name: 'John' },
      },
    })
  })
})

it('infers the query variables type', () => {
  graphql.query(GetUserQuery, ({ query, variables }) => {
    expectTypeOf(query).toBeString()
    expectTypeOf(variables).toEqualTypeOf<{ userId: string }>()

    return HttpResponse.json({
      data: {
        user: { name: 'John' },
      },
    })
  })
})

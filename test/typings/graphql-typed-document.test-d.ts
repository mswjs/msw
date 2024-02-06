import { graphql, HttpResponse } from 'msw'
import type { TypedDocumentNode } from '../../src/core/graphql'

const GetUserQuery = {} as TypedDocumentNode<
  {
    user: {
      name: string
    }
  },
  { userId: string }
>

graphql.query(GetUserQuery, ({ variables }) => {
  variables.userId.toUpperCase()

  return HttpResponse.json({
    data: {
      user: { name: 'John' },
    },
  })
})

graphql.query(GetUserQuery, ({ variables }) => {
  // @ts-expect-error Unknown variable
  variables.unknownVariable

  return HttpResponse.json({
    data: {
      user: { name: 'John' },
    },
  })
})

graphql.query(
  GetUserQuery,
  // @ts-expect-error Invalid response type.
  () => {
    return HttpResponse.json({
      data: {
        user: { name: 123 },
      },
    })
  },
)

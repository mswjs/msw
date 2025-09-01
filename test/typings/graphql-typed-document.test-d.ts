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

graphql.query(GetUserQuery, () => {
  return HttpResponse.json({
    data: {
      user: {
        // @ts-expect-error Invalid response type.
        name: 123,
      },
    },
  })
})

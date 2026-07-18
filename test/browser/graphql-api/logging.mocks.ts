import { HttpResponse } from 'msw'
import { graphql } from 'msw/graphql'
import { setupWorker } from 'msw/browser'

interface GetUserDetailQuery {
  user: {
    firstName: string
    lastName: string
  }
}

interface LoginQuery {
  user: {
    id: string
  }
}

const api = graphql.link('http://localhost:8080/graphql')

const worker = setupWorker(
  api.query<GetUserDetailQuery>('GetUserDetail', () => {
    return HttpResponse.json({
      data: {
        user: {
          firstName: 'John',
          lastName: 'Maverick',
        },
      },
    })
  }),
  api.mutation<LoginQuery>('Login', () => {
    return HttpResponse.json({
      data: {
        user: {
          id: 'abc-123',
        },
      },
    })
  }),
  api.operation(() => {
    return HttpResponse.json(
      {
        data: {
          ok: true,
        },
      },
      {
        status: 301,
      },
    )
  }),
)

worker.start()

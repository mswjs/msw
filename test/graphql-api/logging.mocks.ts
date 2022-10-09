import { setupWorker, graphql, HttpResponse } from 'msw'

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

const worker = setupWorker(
  graphql.query<GetUserDetailQuery>('GetUserDetail', () => {
    return HttpResponse.json({
      data: {
        user: {
          firstName: 'John',
          lastName: 'Maverick',
        },
      },
    })
  }),
  graphql.mutation<LoginQuery>('Login', () => {
    return HttpResponse.json({
      data: {
        user: {
          id: 'abc-123',
        },
      },
    })
  }),
  graphql.operation(() => {
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

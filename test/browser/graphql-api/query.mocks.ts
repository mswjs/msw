import { graphql, HttpResponse } from 'msw'
import { setupWorker } from 'msw/browser'

interface GetUserDetailQuery {
  user: {
    firstName: string
    lastName: string
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
)

worker.start()

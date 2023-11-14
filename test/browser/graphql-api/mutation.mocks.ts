import { graphql, HttpResponse } from 'msw'
import { setupWorker } from 'msw/browser'

interface LogoutQuery {
  logout: {
    userSession: boolean
  }
}

const worker = setupWorker(
  graphql.mutation<LogoutQuery>('Logout', () => {
    return HttpResponse.json({
      data: {
        logout: {
          userSession: false,
        },
      },
    })
  }),
)

worker.start()

import { HttpResponse } from 'msw'
import { graphql } from 'msw/graphql'
import { setupWorker } from 'msw/browser'

const api = graphql.link('*')

interface LogoutQuery {
  logout: {
    userSession: boolean
  }
}

const worker = setupWorker(
  api.mutation<LogoutQuery>('Logout', () => {
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

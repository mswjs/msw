import { graphql, HttpResponse } from 'msw'
import { setupWorker } from 'msw/browser'

interface LoginQuery {
  user: {
    id: number
    name: string
    password: string
  }
}

const worker = setupWorker(
  graphql.query<LoginQuery>('Login', () => {
    return HttpResponse.json({
      data: {
        user: {
          id: 1,
          name: 'Joe Bloggs',
          password: 'HelloWorld!',
        },
      },
      extensions: {
        message: 'This is a mocked extension',
        tracking: {
          version: '0.1.2',
          page: '/test/',
        },
      },
    })
  }),
)

worker.start()

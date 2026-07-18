import { HttpResponse } from 'msw'
import { graphql } from 'msw/graphql'
import { setupWorker } from 'msw/browser'

const api = graphql.link('/graphql')

const worker = setupWorker(
  api.query('GetUser', () => {
    return HttpResponse.json(
      {
        data: {
          firstName: 'John',
        },
      },
      {
        headers: {
          'Set-Cookie': 'test-cookie=value',
        },
      },
    )
  }),
)

worker.start()

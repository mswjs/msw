import { HttpResponse } from 'msw'
import { graphql } from 'msw/graphql'
import { setupWorker } from 'msw/browser'

const api = graphql.link('/graphql')

const worker = setupWorker(
  api.query('Login', () => {
    return HttpResponse.json({
      errors: [
        {
          message: 'This is a mocked error',
          locations: [
            {
              line: 1,
              column: 2,
            },
          ],
        },
      ],
    })
  }),
)

worker.start()

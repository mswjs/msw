import { graphql, HttpResponse } from 'msw'
import { setupWorker } from 'msw/browser'

const worker = setupWorker(
  graphql.query('Login', () => {
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

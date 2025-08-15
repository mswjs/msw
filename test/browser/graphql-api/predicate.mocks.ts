import { graphql, HttpResponse } from 'msw'
import { setupWorker } from 'msw/browser'

const worker = setupWorker(
  graphql.query(
    ({ operationName, variables }) =>
      operationName === 'GetUserDetail' && variables.id === 'abc-123',
    () => {
      return HttpResponse.json({
        data: {
          user: {
            firstName: 'John',
            lastName: 'Maverick',
          },
        },
      })
    },
  ),
)

worker.start()

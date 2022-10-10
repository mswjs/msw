import { setupWorker, rest, HttpResponse } from 'msw'
import * as JSONbig from 'json-bigint'

const worker = setupWorker(
  rest.get('/user', () => {
    return HttpResponse.plain(
      JSONbig.stringify({
        username: 'john.maverick',
        balance: BigInt(1597928668063727616),
      }),
      {
        headers: {
          'Content-Type': 'application/json',
        },
      },
    )
  }),
)

worker.start()

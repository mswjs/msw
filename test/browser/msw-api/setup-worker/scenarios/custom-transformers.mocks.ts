import { http, HttpResponse } from 'msw'
import { setupWorker } from 'msw/browser'
import * as JSONbig from 'json-bigint'

const worker = setupWorker(
  http.get('/user', () => {
    return new HttpResponse(
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

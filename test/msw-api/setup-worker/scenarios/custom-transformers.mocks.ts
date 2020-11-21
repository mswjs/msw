import { setupWorker, rest, createResponseComposition } from 'msw'
import * as JSONbig from 'json-bigint'

const customReponse = createResponseComposition(null, [
  (res) => {
    if (res.body && res.headers?.get('content-type')?.includes('json')) {
      res.body = JSONbig.stringify(res.body)
    }

    return res
  },
])

const worker = setupWorker(
  rest.get('/user', (req, res, ctx) => {
    const user = {
      username: 'john.maverick',
      balance: BigInt(1597928668063727616),
    }

    return customReponse(ctx.json(user))
  }),
)

worker.start()

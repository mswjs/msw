import { setupWorker, rest, createResponseComposition } from 'msw'
import * as JSONbig from 'json-bigint'

const customReponse = createResponseComposition({
  defaultTransformers: [
    (res) => {
      if (res.body && res.headers?.get('content-type')?.endsWith('json')) {
        res.body = JSONbig.stringify(res.body)
      }

      return res
    },
  ],
})

const worker = setupWorker(
  rest.get('/me', (req, res, ctx) => {
    const me = {
      username: 'Dude',
      balance: BigInt(1597928668063727616),
    }
    return customReponse(ctx.json(me))
  }),
)

worker.start()

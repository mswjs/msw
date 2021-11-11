import { ResponseTransformer, compose, context, setupWorker, rest } from 'msw'
import * as JSONbig from 'json-bigint'

const jsonBig = (body: Record<string, any>): ResponseTransformer => {
  return compose(
    context.set('Content-Type', 'application/json'),
    context.body(JSONbig.stringify(body)),
  )
}

const worker = setupWorker(
  rest.get('/user', (req, res) => {
    return res(
      jsonBig({
        username: 'john.maverick',
        balance: BigInt(1597928668063727616),
      }),
    )
  }),
)

worker.start()

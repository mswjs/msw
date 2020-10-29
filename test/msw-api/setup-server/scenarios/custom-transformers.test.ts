import fetch from 'node-fetch'
import { rest, createResponseComposition } from 'msw'
import { setupServer } from 'msw/node'
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

const server = setupServer(
  rest.get('http://test.mswjs.io/me', (req, res, ctx) => {
    const me = {
      username: 'Dude',
      balance: BigInt(1597928668063727616),
    }
    return customReponse(ctx.json(me))
  }),
)

beforeAll(() => {
  server.listen()
})

afterAll(() => {
  server.close()
})

test('should use custom transformes and parse BigInt', async () => {
  const res = await fetch('http://test.mswjs.io/me')
  const body = await res.text()

  expect(body).toEqual(
    JSONbig.stringify({
      username: 'Dude',
      balance: BigInt(1597928668063727616),
    }),
  )
})

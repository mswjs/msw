import fetch from 'node-fetch'
import * as JSONbig from 'json-bigint'
import { ResponseTransformer, compose, context, rest } from 'msw'
import { setupServer } from 'msw/node'

const jsonBig = (body: Record<string, any>): ResponseTransformer => {
  return compose(
    context.set('Content-Type', 'application/json'),
    context.body(JSONbig.stringify(body)),
  )
}

const server = setupServer(
  rest.get('http://test.mswjs.io/me', (req, res, ctx) => {
    return res(
      jsonBig({
        username: 'john.maverick',
        balance: BigInt(1597928668063727616),
      }),
    )
  }),
)

beforeAll(() => {
  server.listen()
})

afterAll(() => {
  server.close()
})

test('uses custom response transformer to stringify response body', async () => {
  const res = await fetch('http://test.mswjs.io/me')
  const body = await res.text()

  expect(body).toEqual(
    JSONbig.stringify({
      username: 'john.maverick',
      balance: BigInt(1597928668063727616),
    }),
  )
})

import fetch from 'node-fetch'
import * as JSONbig from 'json-bigint'
import { rest, createResponseComposition, MockedResponse } from 'msw'
import { setupServer } from 'msw/node'

function stringifyJsonBigInt(res: MockedResponse<string>) {
  if (res.body && res.headers?.get('content-type')?.endsWith('json')) {
    res.body = JSONbig.stringify(res.body)
  }

  return res
}

const customReponse = createResponseComposition(null, [stringifyJsonBigInt])

const server = setupServer(
  rest.get('http://test.mswjs.io/me', (req, res, ctx) => {
    return customReponse(
      ctx.json({
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

import * as JSONbig from 'json-bigint'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'

const server = setupServer(
  http.get('http://test.mswjs.io/me', () => {
    return new HttpResponse(
      JSONbig.stringify({
        username: 'john.maverick',
        balance: BigInt(1597928668063727616),
      }),
      {
        headers: {
          'Content-Tpye': 'application/json',
        },
      },
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

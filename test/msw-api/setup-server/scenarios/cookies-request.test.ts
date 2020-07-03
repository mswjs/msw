import * as https from 'https'
import { rest } from 'msw'
import { setupServer } from 'msw/node'

const server = setupServer(
  rest.get('https://test.mswjs.io/user', (req, res, ctx) => {
    return res(ctx.json({ cookies: req.cookies }))
  }),
)

beforeAll(() => server.listen())
afterAll(() => server.close())

test('has access to request cookies', (done) => {
  let resBody = ''

  https
    .get(
      {
        method: 'GET',
        protocol: 'https:',
        host: 'test.mswjs.io',
        path: '/user',
        headers: {
          Cookie: 'auth-token=abc-123',
        },
      },
      (res) => {
        res.setEncoding('utf8')
        res.on('error', done)
        res.on('data', (chunk) => {
          resBody += chunk
        })

        res.on('end', () => {
          const resJsonBody = JSON.parse(resBody)
          expect(resJsonBody).toEqual({
            cookies: {
              'auth-token': 'abc-123',
            },
          })

          done()
        })
      },
    )
    .end()
})

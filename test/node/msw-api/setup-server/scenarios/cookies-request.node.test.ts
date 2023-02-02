import * as https from 'https'
import { rest } from 'msw'
import { setupServer, SetupServerApi } from 'msw/node'
import { HttpServer } from '@open-draft/test-server/http'

const httpServer = new HttpServer((app) => {
  app.get('/user', (req, res) => {
    res.json({ works: false })
  })
})

let server: SetupServerApi

beforeAll(async () => {
  await httpServer.listen()

  server = setupServer(
    rest.get(httpServer.https.url('/user'), (req, res, ctx) => {
      return res(ctx.json({ cookies: req.cookies }))
    }),
  )

  server.listen()
})

afterAll(async () => {
  server.close()
  await httpServer.close()
})

test('has access to request cookies', (done) => {
  let responseBody = ''
  const url = new URL(httpServer.https.url('/user'))

  https.get(
    {
      method: 'GET',
      protocol: url.protocol,
      host: url.host,
      path: url.pathname,
      headers: {
        Cookie: 'auth-token=abc-123',
      },
    },
    (res) => {
      res.setEncoding('utf8')
      res.on('error', done)
      res.on('data', (chunk) => (responseBody += chunk))
      res.on('end', () => {
        const json = JSON.parse(responseBody)
        expect(json).toEqual({
          cookies: {
            'auth-token': 'abc-123',
          },
        })

        done()
      })
    },
  )
})

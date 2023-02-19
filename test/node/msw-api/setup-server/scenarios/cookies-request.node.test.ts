/**
 * @jest-environment node
 */
import https from 'https'
import { rest } from 'msw'
import { setupServer, SetupServerApi } from 'msw/node'
import { HttpServer } from '@open-draft/test-server/http'
import { waitForClientRequest } from '../../../../support/utils'

let server: SetupServerApi

const httpServer = new HttpServer((app) => {
  app.get('/user', (req, res) => {
    res.json({ works: false })
  })
})

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

test('has access to request cookies', async () => {
  const url = new URL(httpServer.https.url('/user'))

  const request = https.get({
    protocol: url.protocol,
    host: url.host,
    path: url.pathname,
    headers: {
      Cookie: 'auth-token=abc-123',
    },
  })
  const { responseText } = await waitForClientRequest(request)

  expect(responseText).toBe('{"cookies":{"auth-token":"abc-123"}}')
})

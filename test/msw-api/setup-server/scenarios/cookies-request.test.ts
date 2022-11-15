/**
 * @jest-environment node
 */
import https from 'https'
import { rest } from 'msw'
import { setupServer } from 'msw/node'
import { ServerApi, createServer } from '@open-draft/test-server'
import { waitForClientRequest } from '../../../support/utils'

let httpServer: ServerApi
const server = setupServer()

beforeAll(async () => {
  httpServer = await createServer((app) => {
    app.get('/user', (req, res) => {
      res.json({ works: false })
    })
  })

  server.listen()
})

afterAll(async () => {
  server.close()
  await httpServer.close()
})

test('has access to request cookies', async () => {
  server.use(
    rest.get(httpServer.https.makeUrl('/user'), (req, res, ctx) => {
      return res(ctx.json({ cookies: req.cookies }))
    }),
  )

  const url = new URL(httpServer.https.makeUrl('/user'))

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

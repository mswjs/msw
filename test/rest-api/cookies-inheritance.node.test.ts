/**
 * @jest-environment node
 */
import fetch from 'node-fetch'
import { rest } from 'msw'
import { setupServer, SetupServerApi } from 'msw/node'
import { ServerApi, createServer } from '@open-draft/test-server'
import { RequestHandler as ExpressRequestHandler } from 'express'

let httpServer: ServerApi
let server: SetupServerApi

beforeAll(async () => {
  httpServer = await createServer((app) => {
    const handler: ExpressRequestHandler = (req, res) => {
      res.status(500).end()
    }
    app.post('/login', handler)
    app.get('/user', handler)
  })

  server = setupServer(
    rest.post(httpServer.https.makeUrl('/login'), (req, res, ctx) => {
      return res(ctx.cookie('authToken', 'abc-123'))
    }),
    rest.get(httpServer.https.makeUrl('/user'), (req, res, ctx) => {
      if (req.cookies.authToken == null) {
        return res(
          ctx.status(403),
          ctx.json({
            error: 'Auth token not found',
          }),
        )
      }

      return res(
        ctx.json({
          firstName: 'John',
          lastName: 'Maverick',
        }),
      )
    }),
  )

  server.listen()
})

afterAll(async () => {
  server.close()
  await httpServer.close()
})

test('inherits cookies set on a preceeding request', async () => {
  const res = await fetch(httpServer.https.makeUrl('/login'), {
    method: 'POST',
  }).then(() => {
    return fetch(httpServer.https.makeUrl('/user'))
  })
  const json = await res.json()

  expect(res.status).toBe(200)
  expect(json).toEqual({
    firstName: 'John',
    lastName: 'Maverick',
  })
})

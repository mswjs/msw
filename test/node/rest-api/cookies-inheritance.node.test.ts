/**
 * @jest-environment node
 */
import fetch from 'node-fetch'
import { rest } from 'msw'
import { setupServer, SetupServerApi } from 'msw/node'
import { HttpServer } from '@open-draft/test-server/http'
import { RequestHandler as ExpressRequestHandler } from 'express'

let server: SetupServerApi

const httpServer = new HttpServer((app) => {
  const handler: ExpressRequestHandler = (req, res) => {
    res.status(500).end()
  }
  app.post('/login', handler)
  app.get('/user', handler)
})

beforeAll(async () => {
  await httpServer.listen()

  server = setupServer(
    rest.post(httpServer.https.url('/login'), (req, res, ctx) => {
      return res(ctx.cookie('authToken', 'abc-123'))
    }),
    rest.get(httpServer.https.url('/user'), (req, res, ctx) => {
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

test('inherits cookies set from a preceeding request', async () => {
  const res = await fetch(httpServer.https.url('/login'), {
    method: 'POST',
  }).then(() => {
    return fetch(httpServer.https.url('/user'))
  })
  const json = await res.json()

  expect(res.status).toBe(200)
  expect(json).toEqual({
    firstName: 'John',
    lastName: 'Maverick',
  })
})

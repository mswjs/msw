/**
 * @jest-environment node
 */
import fetch from 'node-fetch'
import { HttpResponse, http } from 'msw'
import { setupServer, SetupServer } from 'msw/node'
import { HttpServer } from '@open-draft/test-server/http'
import { RequestHandler as ExpressRequestHandler } from 'express'

let server: SetupServer

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
    http.post(httpServer.https.url('/login'), () => {
      return new HttpResponse(null, {
        headers: {
          'Set-Cookie': 'authToken=abc-123-%E7%94%B2%E4%B9%99%E4%B8%99',
        },
      })
    }),
    http.get<
      never,
      never,
      { firstName: string; lastName: string } | { error: string }
    >(httpServer.https.url('/user'), ({ cookies }) => {
      if (cookies.authToken == null) {
        return HttpResponse.json(
          {
            error: 'Auth token not found',
          },
          { status: 403 },
        )
      }

      return HttpResponse.json({
        firstName: 'John',
        lastName: 'Maverick',
      })
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

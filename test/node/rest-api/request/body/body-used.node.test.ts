/**
 * @vitest-environment node
 */
import { HttpResponse, http } from 'msw'
import { setupServer } from 'msw/node'
import * as express from 'express'
import { HttpServer } from '@open-draft/test-server/http'

const httpServer = new HttpServer((app) => {
  app.post('/resource', express.json(), (req, res) => {
    res.json({ response: `received: ${req.body.message}` })
  })
})

const server = setupServer()

beforeAll(async () => {
  server.listen()
  await httpServer.listen()
})

afterEach(() => {
  server.resetHandlers()
  vi.restoreAllMocks()
})

afterAll(async () => {
  server.close()
  await httpServer.close()
})

it('does not read the body while parsing an unhandled request', async () => {
  // Expecting an unhandled request warning in this test.
  vi.spyOn(console, 'warn').mockImplementation(() => {})

  const requestUrl = httpServer.http.url('/resource')
  const response = await fetch(requestUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message: 'Hello server',
    }),
  })
  expect(await response.json()).toEqual({ response: `received: Hello server` })
})

it('does not read the body while parsing an unhandled request', async () => {
  const requestUrl = httpServer.http.url('/resource')
  server.use(
    http.post(requestUrl, () => {
      return HttpResponse.json({ mocked: true })
    }),
  )
  const response = await fetch(requestUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message: 'Hello server',
    }),
  })
  expect(await response.json()).toEqual({ mocked: true })
})

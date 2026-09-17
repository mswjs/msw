// @vitest-environment node
import { http, bypass } from 'msw'
import { setupServer } from 'msw/node'
import express from 'express'
import { HttpServer } from '@open-draft/test-server/http'

const httpServer = new HttpServer((app) => {
  app.use('/resource', (_req, res, next) => {
    res.setHeader('access-control-allow-headers', '*')
    next()
  })
  app.post('/resource', express.text(), (req, res) => {
    res.json({
      text: req.body,
      requestHeaders: req.headers,
    })
  })
})

const server = setupServer()

beforeAll(async () => {
  server.listen()
  await httpServer.listen()
})

afterEach(() => {
  server.resetHandlers()
})

afterAll(async () => {
  server.close()
  await httpServer.close()
})

it('supports patching an original HTTP response', async () => {
  server.use(
    http.post(httpServer.http.url('/resource'), async ({ request }) => {
      const originalResponse = await fetch(bypass(request))
      const { text, requestHeaders } = await originalResponse.json()
      return new Response(text.toUpperCase(), { headers: requestHeaders })
    }),
  )

  const response = await fetch(httpServer.http.url('/resource'), {
    method: 'POST',
    body: 'world',
  })

  await expect(response.text()).resolves.toBe('WORLD')

  // Must not contain the internal bypass request header.
  expect(Object.fromEntries(response.headers)).toHaveProperty('accept', '*/*')
})

it('preserves request "accept" header when patching a response', async () => {
  server.use(
    http.post(httpServer.http.url('/resource'), async ({ request }) => {
      const originalResponse = await fetch(bypass(request))
      const { text, requestHeaders } = await originalResponse.json()
      return new Response(text.toUpperCase(), { headers: requestHeaders })
    }),
  )

  const response = await fetch(httpServer.http.url('/resource'), {
    method: 'POST',
    headers: {
      accept: 'application/json',
    },
    body: 'world',
  })

  await expect(response.text()).resolves.toBe('WORLD')

  // Must not contain the internal bypass request header.
  expect(Object.fromEntries(response.headers)).toHaveProperty(
    'accept',
    'application/json',
  )
})

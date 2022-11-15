/**
 * @jest-environment node
 */
import https from 'https'
import { ServerApi, createServer } from '@open-draft/test-server'
import { rest } from 'msw'
import { setupServer } from 'msw/node'
import { waitForClientRequest } from '../../../support/utils'

let httpServer: ServerApi
const server = setupServer()

beforeAll(async () => {
  server.listen()

  httpServer = await createServer((app) => {
    app.get('/resource', (_, res) => {
      return res.status(500).send('original-response')
    })
  })
})

beforeEach(() => {
  server.use(
    rest.get(httpServer.https.makeUrl('/resource'), (req, res, ctx) => {
      return res(
        ctx.status(401),
        ctx.set('x-header', 'yes'),
        ctx.json({ firstName: 'John' }),
      )
    }),
  )
})

afterEach(() => {
  server.resetHandlers()
})

afterAll(async () => {
  server.close()
  await httpServer.close()
})

it('returns a mocked response to an "https.get" request', async () => {
  const request = https.get(httpServer.https.makeUrl('/resource'))
  const { response, responseText } = await waitForClientRequest(request)

  expect(response.statusCode).toBe(401)
  expect(response.headers).toEqual(
    expect.objectContaining({
      'content-type': 'application/json',
      'x-header': 'yes',
    }),
  )
  expect(responseText).toBe('{"firstName":"John"}')
})

it('returns a mocked response to an "https.request" request', async () => {
  const request = https.request(httpServer.https.makeUrl('/resource'))
  request.end()
  const { response, responseText } = await waitForClientRequest(request)

  expect(response.statusCode).toBe(401)
  expect(response.headers).toEqual(
    expect.objectContaining({
      'content-type': 'application/json',
      'x-header': 'yes',
    }),
  )
  expect(responseText).toBe('{"firstName":"John"}')
})

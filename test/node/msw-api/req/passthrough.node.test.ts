/**
 * @jest-environment node
 */
import fetch from 'node-fetch'
import { rest } from 'msw'
import { setupServer } from 'msw/node'
import { HttpServer } from '@open-draft/test-server/http'

const httpServer = new HttpServer((app) => {
  app.post<never, ResponseBody>('/user', (req, res) => {
    res.json({ name: 'John' })
  })
})

const server = setupServer()

interface ResponseBody {
  name: string
}

beforeAll(async () => {
  await httpServer.listen()

  server.listen()

  jest.spyOn(console, 'warn').mockImplementation()
})

afterEach(() => {
  server.resetHandlers()
  jest.resetAllMocks()
})

afterAll(async () => {
  server.close()
  jest.restoreAllMocks()
  await httpServer.close()
})

it('performs request as-is when returning "req.passthrough" call in the resolver', async () => {
  const endpointUrl = httpServer.http.url('/user')
  server.use(
    rest.post<never, ResponseBody>(endpointUrl, (req) => {
      return req.passthrough()
    }),
  )

  const res = await fetch(endpointUrl, { method: 'POST' })
  const json = await res.json()

  expect(json).toEqual<ResponseBody>({
    name: 'John',
  })
  expect(console.warn).not.toHaveBeenCalled()
})

it('does not allow fall-through when returning "req.passthrough" call in the resolver', async () => {
  const endpointUrl = httpServer.http.url('/user')
  server.use(
    rest.post<never, ResponseBody>(endpointUrl, (req) => {
      return req.passthrough()
    }),
    rest.post<never, ResponseBody>(endpointUrl, (req, res, ctx) => {
      return res(ctx.json({ name: 'Kate' }))
    }),
  )

  const res = await fetch(endpointUrl, { method: 'POST' })
  const json = await res.json()

  expect(json).toEqual<ResponseBody>({
    name: 'John',
  })
  expect(console.warn).not.toHaveBeenCalled()
})

it('prints a warning and performs a request as-is if nothing was returned from the resolver', async () => {
  const endpointUrl = httpServer.http.url('/user')
  server.use(
    rest.post<never, ResponseBody>(endpointUrl, () => {
      return
    }),
  )

  const res = await fetch(endpointUrl, { method: 'POST' })
  const json = await res.json()

  expect(json).toEqual<ResponseBody>({
    name: 'John',
  })

  const warning = (console.warn as any as jest.SpyInstance).mock.calls[0][0]

  expect(warning).toContain(
    '[MSW] Expected response resolver to return a mocked response Object, but got undefined. The original response is going to be used instead.',
  )
  expect(warning).toContain(`POST ${endpointUrl}`)
  expect(console.warn).toHaveBeenCalledTimes(1)
})

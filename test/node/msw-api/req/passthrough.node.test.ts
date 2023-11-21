/**
 * @vitest-environment node
 */
import { HttpResponse, passthrough, http } from 'msw'
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
})

beforeEach(() => {
  vi.spyOn(console, 'warn').mockImplementation(() => void 0)
})

afterEach(() => {
  server.resetHandlers()
  vi.restoreAllMocks()
})

afterAll(async () => {
  server.close()
  await httpServer.close()
})

it('performs request as-is when returning "req.passthrough" call in the resolver', async () => {
  const endpointUrl = httpServer.http.url('/user')
  server.use(
    http.post<ResponseBody>(endpointUrl, () => {
      return passthrough()
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
    http.post<ResponseBody>(endpointUrl, () => {
      return passthrough()
    }),
    http.post<ResponseBody>(endpointUrl, () => {
      return HttpResponse.json({ name: 'Kate' })
    }),
  )

  const res = await fetch(endpointUrl, { method: 'POST' })
  const json = await res.json()

  expect(json).toEqual<ResponseBody>({
    name: 'John',
  })
  expect(console.warn).not.toHaveBeenCalled()
})

it('performs a request as-is if nothing was returned from the resolver', async () => {
  const endpointUrl = httpServer.http.url('/user')
  server.use(
    http.post<ResponseBody>(endpointUrl, () => {
      return
    }),
  )

  const res = await fetch(endpointUrl, { method: 'POST' })
  const json = await res.json()

  expect(json).toEqual<ResponseBody>({
    name: 'John',
  })
})

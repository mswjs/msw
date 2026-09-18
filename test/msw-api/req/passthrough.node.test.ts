// @vitest-environment node
import { HttpResponse, passthrough, http } from 'msw'
import { setupServer } from 'msw/node'
import { HttpServer } from '@open-draft/test-server/http'

const httpServer = new HttpServer((app) => {
  app.post<never, ResponseBody>('/user', (req, response) => {
    response.json({ name: 'John' })
  })
  app.post('/code/:code', (req, response) => {
    response.status(parseInt(req.params.code)).send()
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

test('performs request as-is when returning "req.passthrough" call in the resolver', async () => {
  const endpointUrl = httpServer.http.url('/user')
  server.use(
    http.post<ResponseBody>(endpointUrl, () => {
      return passthrough()
    }),
  )

  const response = await fetch(endpointUrl, { method: 'POST' })
  const json = await response.json()

  expect(json).toEqual<ResponseBody>({
    name: 'John',
  })
  expect(console.warn).not.toHaveBeenCalled()
})

test('does not allow fall-through when returning "req.passthrough" call in the resolver', async () => {
  const endpointUrl = httpServer.http.url('/user')
  server.use(
    http.post<ResponseBody>(endpointUrl, () => {
      return passthrough()
    }),
    http.post<ResponseBody>(endpointUrl, () => {
      return HttpResponse.json({ name: 'Kate' })
    }),
  )

  const response = await fetch(endpointUrl, { method: 'POST' })
  const json = await response.json()

  expect(json).toEqual<ResponseBody>({
    name: 'John',
  })
  expect(console.warn).not.toHaveBeenCalled()
})

test('performs a request as-is if nothing was returned from the resolver', async () => {
  const endpointUrl = httpServer.http.url('/user')
  server.use(
    http.post<ResponseBody>(endpointUrl, () => {
      return
    }),
  )

  const response = await fetch(endpointUrl, { method: 'POST' })
  const json = await response.json()

  expect(json).toEqual<ResponseBody>({
    name: 'John',
  })
})

for (const code of [204, 205, 304]) {
  test(`performs a ${code} request as-is if nothing was returned from the resolver`, async () => {
    const endpointUrl = httpServer.http.url(`/code/${code}`)
    server.use(
      http.post<ResponseBody>(endpointUrl, () => {
        return
      }),
    )

    const response = await fetch(endpointUrl, { method: 'POST' })

    expect(response.status).toEqual(code)
  })

  test(`performs a ${code} request as-is if passthrough was returned from the resolver`, async () => {
    const endpointUrl = httpServer.http.url(`/code/${code}`)
    server.use(
      http.post<ResponseBody>(endpointUrl, () => {
        return passthrough()
      }),
    )

    const response = await fetch(endpointUrl, { method: 'POST' })

    expect(response.status).toEqual(code)
  })
}

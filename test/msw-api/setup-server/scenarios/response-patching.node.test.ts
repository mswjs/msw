// @vitest-environment node
import { createTestHttpServer } from '@epic-web/test-server/http'
import { HttpResponse, http, bypass } from 'msw'
import { setupServer } from 'msw/node'

interface ResponseBody {
  id: number
  mocked: boolean
}

const server = setupServer()

beforeAll(() => {
  server.listen()
})

afterEach(() => {
  server.resetHandlers()
})

afterAll(() => {
  server.close()
})

test('returns a combination of mocked and original responses', async () => {
  await using httpServer = await createTestHttpServer({
    defineRoutes(router) {
      router.get('/user', () => {
        return Response.json({ id: 101 })
      })
    },
  })
  server.use(
    http.get('https://test.mswjs.io/user', async () => {
      const originalResponse = await fetch(
        bypass(httpServer.http.url('/user').href),
      )
      const body = await originalResponse.json()

      return HttpResponse.json({
        id: body.id,
        mocked: true,
      })
    }),
  )

  const response = await fetch('https://test.mswjs.io/user')
  const { status } = response
  const body = await response.json()

  expect(status).toBe(200)
  expect(body).toEqual<ResponseBody>({
    id: 101,
    mocked: true,
  })
})

test('bypasses a mocked request when using "bypass()"', async () => {
  await using httpServer = await createTestHttpServer({
    defineRoutes(router) {
      router.post('/user', () => {
        return Response.json({ id: 202 })
      })
    },
  })
  server.use(
    http.get('https://test.mswjs.io/complex-request', async () => {
      const originalResponse = await fetch(
        bypass(
          new Request(httpServer.http.url('/user').href, {
            method: 'POST',
          }),
        ),
      ).then((response) => response.json())

      return HttpResponse.json({
        id: originalResponse.id,
        mocked: true,
      })
    }),
    http.post('https://httpbin.org/post', () => {
      return HttpResponse.json({ id: 303 })
    }),
  )

  const response = await fetch('https://test.mswjs.io/complex-request')

  expect(response.status).toBe(200)
  expect(await response.json()).toEqual<ResponseBody>({
    id: 202,
    mocked: true,
  })
})

test('falls into the mocked request when using "fetch" directly', async () => {
  server.use(
    http.get('https://test.mswjs.io/complex-request', async () => {
      const originalResponse = await fetch('https://httpbin.org/post', {
        method: 'POST',
      }).then((response) => response.json())

      return HttpResponse.json({
        id: originalResponse.id,
        mocked: true,
      })
    }),
    http.post('https://httpbin.org/post', () => {
      return HttpResponse.json({ id: 303 })
    }),
  )

  const response = await fetch('https://test.mswjs.io/complex-request')

  expect(response.status).toBe(200)
  expect(await response.json()).toEqual<ResponseBody>({
    id: 303,
    mocked: true,
  })
})

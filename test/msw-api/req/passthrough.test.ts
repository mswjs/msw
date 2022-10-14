/**
 * @jest-environment jsdom
 */
import * as path from 'path'
import { pageWith } from 'page-with'
import { HttpResponse, rest, SetupWorkerApi } from 'msw'
import { createServer, ServerApi } from '@open-draft/test-server'

declare namespace window {
  export const msw: {
    worker: SetupWorkerApi
    rest: typeof rest
    HttpResponse: typeof HttpResponse
  }
}

interface ResponseBody {
  name: string
}

function prepareRuntime() {
  return pageWith({
    example: path.resolve(__dirname, 'passthrough.mocks.ts'),
  })
}

let httpServer: ServerApi

beforeAll(async () => {
  httpServer = await createServer((app) => {
    app.post<never, ResponseBody>('/user', (req, res) => {
      res.json({ name: 'John' })
    })
  })
})

afterAll(async () => {
  await httpServer.close()
})

it('performs request as-is when returning "req.passthrough" call in the resolver', async () => {
  const runtime = await prepareRuntime()
  const endpointUrl = httpServer.http.makeUrl('/user')

  await runtime.page.evaluate((endpointUrl) => {
    const { worker, rest } = window.msw
    worker.use(
      rest.post<ResponseBody>(endpointUrl, (req) => {
        return req.passthrough()
      }),
    )
  }, endpointUrl)

  const res = await runtime.request(endpointUrl, { method: 'POST' })
  const headers = await res.allHeaders()
  const json = await res.json()

  expect(json).toEqual<ResponseBody>({
    name: 'John',
  })
  expect(headers).toHaveProperty('x-powered-by', 'Express')
  expect(runtime.consoleSpy.get('warning')).toBeUndefined()
})

it('does not allow fall-through when returning "req.passthrough" call in the resolver', async () => {
  const runtime = await prepareRuntime()
  const endpointUrl = httpServer.http.makeUrl('/user')

  await runtime.page.evaluate((endpointUrl) => {
    const { worker, rest, HttpResponse } = window.msw
    worker.use(
      rest.post<ResponseBody>(endpointUrl, (req) => {
        return req.passthrough()
      }),
      rest.post<ResponseBody>(endpointUrl, () => {
        return HttpResponse.json({ name: 'Kate' })
      }),
    )
  }, endpointUrl)

  const res = await runtime.request(endpointUrl, { method: 'POST' })
  const headers = await res.allHeaders()
  const json = await res.json()

  expect(json).toEqual<ResponseBody>({
    name: 'John',
  })
  expect(headers).toHaveProperty('x-powered-by', 'Express')
  expect(runtime.consoleSpy.get('warning')).toBeUndefined()
})

it('prints a warning and performs a request as-is if nothing was returned from the resolver', async () => {
  const runtime = await prepareRuntime()
  const endpointUrl = httpServer.http.makeUrl('/user')

  await runtime.page.evaluate((endpointUrl) => {
    const { worker, rest } = window.msw
    worker.use(
      rest.post<ResponseBody>(endpointUrl, () => {
        return
      }),
    )
  }, endpointUrl)

  const res = await runtime.request(endpointUrl, { method: 'POST' })
  const headers = await res.allHeaders()
  const json = await res.json()

  expect(json).toEqual<ResponseBody>({
    name: 'John',
  })
  expect(headers).toHaveProperty('x-powered-by', 'Express')

  expect(runtime.consoleSpy.get('warning')).toEqual(
    expect.arrayContaining([
      expect.stringContaining(
        '[MSW] Expected response resolver to return a mocked response Object, but got undefined. The original response is going to be used instead.',
      ),
    ]),
  )
})

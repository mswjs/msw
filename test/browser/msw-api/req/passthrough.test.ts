import { rest, SetupWorkerApi } from 'msw'
import { test, expect } from '../../playwright.extend'

const PASSTHROUGH_EXAMPLE = require.resolve('./passthrough.mocks.ts')

declare namespace window {
  export const msw: {
    worker: SetupWorkerApi
    rest: typeof rest
  }
}

interface ResponseBody {
  name: string
}

test('performs request as-is when returning "req.passthrough" call in the resolver', async ({
  createServer,
  loadExample,
  spyOnConsole,
  fetch,
  page,
}) => {
  const server = await createServer((app) => {
    app.post('/user', (_, res) => {
      res.json({ name: 'John' })
    })
  })

  const consoleSpy = spyOnConsole()
  await loadExample(PASSTHROUGH_EXAMPLE)
  const endpointUrl = server.http.url('/user')

  await page.evaluate((endpointUrl) => {
    const { worker, rest } = window.msw
    worker.use(
      rest.post<never, ResponseBody>(endpointUrl, (req) => {
        return req.passthrough()
      }),
    )
  }, endpointUrl)

  const res = await fetch(endpointUrl, { method: 'POST' })
  const headers = await res.allHeaders()
  const json = await res.json()

  expect(headers).toHaveProperty('x-powered-by', 'Express')
  expect(json).toEqual({
    name: 'John',
  })
  expect(consoleSpy.get('warning')).toBeUndefined()
})

test('does not allow fall-through when returning "req.passthrough" call in the resolver', async ({
  createServer,
  loadExample,
  spyOnConsole,
  fetch,
  page,
}) => {
  const server = await createServer((app) => {
    app.post('/user', (_, res) => {
      res.json({ name: 'John' })
    })
  })

  const consoleSpy = spyOnConsole()
  await loadExample(PASSTHROUGH_EXAMPLE)
  const endpointUrl = server.http.url('/user')

  await page.evaluate((endpointUrl) => {
    const { worker, rest } = window.msw

    worker.use(
      rest.post<never, ResponseBody>(endpointUrl, (req) => {
        return req.passthrough()
      }),
      rest.post<never, ResponseBody>(endpointUrl, (req, res, ctx) => {
        return res(ctx.json({ name: 'Kate' }))
      }),
    )
  }, endpointUrl)

  const res = await fetch(endpointUrl, { method: 'POST' })
  const headers = await res.allHeaders()
  const json = await res.json()

  expect(headers).toHaveProperty('x-powered-by', 'Express')
  expect(json).toEqual({
    name: 'John',
  })
  expect(consoleSpy.get('warning')).toBeUndefined()
})

test('prints a warning and performs a request as-is if nothing was returned from the resolver', async ({
  createServer,
  loadExample,
  spyOnConsole,
  fetch,
  page,
}) => {
  const server = await createServer((app) => {
    app.post('/user', (_, res) => {
      res.json({ name: 'John' })
    })
  })

  const consoleSpy = spyOnConsole()
  await loadExample(PASSTHROUGH_EXAMPLE)
  const endpointUrl = server.http.url('/user')

  await page.evaluate((endpointUrl) => {
    const { worker, rest } = window.msw
    worker.use(
      rest.post<never, ResponseBody>(endpointUrl, () => {
        return
      }),
    )
  }, endpointUrl)

  const res = await fetch(endpointUrl, { method: 'POST' })
  const headers = await res.allHeaders()
  const json = await res.json()

  expect(headers).toHaveProperty('x-powered-by', 'Express')
  expect(json).toEqual({
    name: 'John',
  })

  expect(consoleSpy.get('warning')).toEqual(
    expect.arrayContaining([
      expect.stringContaining(
        '[MSW] Expected response resolver to return a mocked response Object, but got undefined. The original response is going to be used instead.',
      ),
    ]),
  )
})

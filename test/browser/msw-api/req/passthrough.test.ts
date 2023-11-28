import { HttpResponse, http, passthrough } from 'msw'
import { SetupWorkerApi } from 'msw/browser'
import { expect, test } from '../../playwright.extend'

const PASSTHROUGH_EXAMPLE = require.resolve('./passthrough.mocks.ts')

declare namespace window {
  export const msw: {
    worker: SetupWorkerApi
    http: typeof http
    passthrough: typeof passthrough
    HttpResponse: typeof HttpResponse
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
    const { worker, http, passthrough } = window.msw
    worker.use(
      http.post<never, ResponseBody>(endpointUrl, () => {
        return passthrough()
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
    const { worker, http, passthrough, HttpResponse } = window.msw

    worker.use(
      http.post<never, ResponseBody>(endpointUrl, () => {
        return passthrough()
      }),
      http.post<never, ResponseBody>(endpointUrl, () => {
        return HttpResponse.json({ name: 'Kate' })
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

test('performs a request as-is if nothing was returned from the resolver', async ({
  createServer,
  loadExample,
  fetch,
  page,
}) => {
  const server = await createServer((app) => {
    app.post('/user', (_, res) => {
      res.json({ name: 'John' })
    })
  })

  await loadExample(PASSTHROUGH_EXAMPLE)
  const endpointUrl = server.http.url('/user')

  await page.evaluate((endpointUrl) => {
    const { worker, http } = window.msw
    worker.use(
      http.post<never, ResponseBody>(endpointUrl, () => {
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
})

for (const code of [204, 205, 304]) {
  test(`performs a ${code} request as-is if passthrough was returned from the resolver`, async ({
    createServer,
    loadExample,
    fetch,
    page,
  }) => {
    const server = await createServer((app) => {
      app.post('/user', (_, res) => {
        res.status(code).send()
      })
    })

    await loadExample(PASSTHROUGH_EXAMPLE)
    const endpointUrl = server.http.url('/user')

    const errors: Array<Error> = []
    page.on('pageerror', (pageError) => {
      errors.push(pageError)
    })

    await page.evaluate((endpointUrl) => {
      const { worker, http, passthrough } = window.msw
      worker.use(
        http.post<never, ResponseBody>(endpointUrl, () => {
          return passthrough()
        }),
      )
    }, endpointUrl)

    const res = await fetch(endpointUrl, { method: 'POST' })
    expect(res.status()).toBe(code)
    expect(errors).toEqual([])
  })

  test(`performs a ${code} request as-is if nothing was returned from the resolver`, async ({
    createServer,
    loadExample,
    fetch,
    page,
  }) => {
    const server = await createServer((app) => {
      app.post('/user', (_, res) => {
        res.status(code).send()
      })
    })

    await loadExample(PASSTHROUGH_EXAMPLE)
    const endpointUrl = server.http.url('/user')

    const errors: Array<Error> = []
    page.on('pageerror', (pageError) => {
      errors.push(pageError)
    })

    await page.evaluate((endpointUrl) => {
      const { worker, http } = window.msw
      worker.use(
        http.post<never, ResponseBody>(endpointUrl, () => {
          return
        }),
      )
    }, endpointUrl)

    const res = await fetch(endpointUrl, { method: 'POST' })
    expect(res.status()).toBe(code)
    expect(errors).toEqual([])
  })
}

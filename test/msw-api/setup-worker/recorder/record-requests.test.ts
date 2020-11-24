import * as path from 'path'
import { runBrowserWith } from '../../../support/runBrowserWith'

async function createRuntime() {
  return runBrowserWith(path.resolve(__dirname, 'record-requests.mocks.ts'), {
    withRoutes(app) {
      app.get('/user', (req, res) => {
        res.setHeader('x-recorder', 'true')

        return res.status(200).json({ name: 'John', surname: 'Maverick' }).end()
      })
      app.post('/user', (req, res) => {
        res.setHeader('x-recorder', 'true')

        return res.status(201).json({ message: 'user created' }).end()
      })
      app.head('/info', (req, res) => {
        res.setHeader('x-recorder', 'true')
        res.setHeader('x-my-header', 'MSW')

        return res.status(200).end()
      })
    },
  })
}

test('should record GET request', async () => {
  const runtime = await createRuntime()

  await runtime.page.evaluate(() => {
    // @ts-ignore
    return window.__MSW__.recorder.record()
  })

  let res = await runtime.request({
    url: `${runtime.origin}/user`,
  })

  let headers = res.headers()

  expect(headers).toHaveProperty('x-powered-by', 'Express')

  const logs = await runtime.page.evaluate(() => {
    // @ts-ignore
    return window.__MSW__.recorder.stop()
  })

  expect(logs).toHaveLength(1)

  await runtime.page.evaluate((logs) => {
    // @ts-ignore
    return window.__MSW__.use(eval(logs[0].function))
  }, logs)

  res = await runtime.request({
    url: `${runtime.origin}/user`,
  })

  headers = res.headers()
  const body = await res.json()

  expect(headers).toHaveProperty('x-powered-by', 'msw,Express')
  expect(headers).toHaveProperty('x-recorder', 'true')
  expect(res.status()).toEqual(200)
  expect(body).toEqual({ name: 'John', surname: 'Maverick' })

  return runtime.cleanup()
})

test('should record POST request', async () => {
  const runtime = await createRuntime()

  await runtime.page.evaluate(() => {
    // @ts-ignore
    return window.__MSW__.recorder.record()
  })

  let res = await runtime.request({
    url: `${runtime.origin}/user`,
    fetchOptions: {
      method: 'POST',
    },
  })

  let headers = res.headers()

  expect(headers).toHaveProperty('x-powered-by', 'Express')

  const logs = await runtime.page.evaluate(() => {
    // @ts-ignore
    return window.__MSW__.recorder.stop()
  })

  expect(logs).toHaveLength(1)

  await runtime.page.evaluate((logs) => {
    // @ts-ignore
    return window.__MSW__.use(eval(logs[0].function))
  }, logs)

  res = await runtime.request({
    url: `${runtime.origin}/user`,
    fetchOptions: {
      method: 'POST',
    },
  })

  headers = res.headers()
  const body = await res.json()

  expect(headers).toHaveProperty('x-powered-by', 'msw,Express')
  expect(headers).toHaveProperty('x-recorder', 'true')
  expect(res.status()).toEqual(201)
  expect(body).toEqual({ message: 'user created' })

  return runtime.cleanup()
})

test('should record HEAD request', async () => {
  const runtime = await createRuntime()

  await runtime.page.evaluate(() => {
    // @ts-ignore
    return window.__MSW__.recorder.record()
  })

  let res = await runtime.request({
    url: `${runtime.origin}/info`,
    fetchOptions: {
      method: 'HEAD',
    },
  })

  let headers = res.headers()

  expect(headers).toHaveProperty('x-powered-by', 'Express')

  const logs = await runtime.page.evaluate(() => {
    // @ts-ignore
    return window.__MSW__.recorder.stop()
  })

  expect(logs).toHaveLength(1)

  await runtime.page.evaluate((logs) => {
    // @ts-ignore
    return window.__MSW__.use(eval(logs[0].function))
  }, logs)

  res = await runtime.request({
    url: `${runtime.origin}/info`,
    fetchOptions: {
      method: 'HEAD',
    },
  })

  headers = res.headers()

  expect(headers).toHaveProperty('x-powered-by', 'msw,Express')
  expect(headers).toHaveProperty('x-recorder', 'true')
  expect(headers).toHaveProperty('x-my-header', 'MSW')
  expect(res.status()).toEqual(200)

  return runtime.cleanup()
})

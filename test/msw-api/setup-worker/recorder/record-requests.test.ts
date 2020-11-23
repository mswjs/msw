import * as path from 'path'
import { runBrowserWith } from '../../../support/runBrowserWith'

async function createRuntime() {
  return runBrowserWith(path.resolve(__dirname, 'record-requests.mocks.ts'), {
    withRoutes(app) {
      app.get('/user', (req, res) => {
        const { authorization } = req.headers

        res.setHeader('x-recorder', 'true')

        if (!authorization) {
          return res.status(403).json({ message: 'error' }).end()
        }

        return res.status(200).json({ name: 'John', surname: 'Maverick' }).end()
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

  expect(headers).not.toHaveProperty('x-powered-by', 'msw')

  const logs = await runtime.page.evaluate(() => {
    // @ts-ignore
    return window.__MSW__.recorder.stop()
  })

  await runtime.page.evaluate((logs) => {
    // @ts-ignore
    return window.__MSW__.use(eval(logs[0]))
  }, logs)

  res = await runtime.request({
    url: `${runtime.origin}/user`,
  })

  headers = res.headers()
  const body = await res.json()

  expect(headers).toHaveProperty('x-powered-by', 'msw,Express')
  expect(headers).toHaveProperty('x-recorder', 'true')
  expect(res.status()).toEqual(403)
  expect(body).toEqual({
    message: 'error',
  })

  return runtime.cleanup()
})

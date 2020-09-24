import * as path from 'path'
import { runBrowserWith } from '../support/runBrowserWith'

function createRuntime() {
  return runBrowserWith(path.resolve(__dirname, 'hard-reload.mocks.ts'))
}

test('keeps the mocking enabled after hard-reload of the page', async () => {
  const runtime = await createRuntime()

  // Passing `true` to `location.reload()` forces a hard reload
  runtime.page.evaluate(() => location.reload(true))

  await runtime.page.waitForNavigation({
    waitUntil: 'networkidle0',
  })

  const res = await runtime.request({
    url: 'https://api.github.com',
  })
  const headers = res.headers()
  const body = await res.json()

  expect(headers).toHaveProperty('x-powered-by', 'msw')
  expect(body).toEqual({
    mocked: true,
  })

  return runtime.cleanup()
})

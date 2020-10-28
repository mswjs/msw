import * as path from 'path'
import { runBrowserWith } from '../support/runBrowserWith'

function prepareRuntime() {
  return runBrowserWith(path.resolve(__dirname, 'status.mocks.ts'))
}

test('sets given status code on the mocked response', async () => {
  const runtime = await prepareRuntime()

  const res = await runtime.request({
    url: `${runtime.origin}/posts`,
  })
  const status = res.status()
  const statusText = res.statusText()

  expect(status).toBe(403)
  expect(statusText).toBe('Forbidden')

  return runtime.cleanup()
})

test('supports custom status text on the mocked response', async () => {
  const runtime = await prepareRuntime()

  const res = await runtime.request({
    url: `${runtime.origin}/user`,
  })
  const status = res.status()
  const statusText = res.statusText()

  expect(status).toBe(401)
  expect(statusText).toBe('Custom text')

  return runtime.cleanup()
})

import * as path from 'path'
import { pageWith } from 'page-with'

function prepareRuntime() {
  return pageWith({ example: path.resolve(__dirname, 'status.mocks.ts') })
}

test('sets given status code on the mocked response', async () => {
  const runtime = await prepareRuntime()

  const res = await runtime.request('/posts')
  const status = res.status()
  const statusText = res.statusText()

  expect(status).toBe(403)
  expect(statusText).toBe('Forbidden')
})

test('supports custom status text on the mocked response', async () => {
  const runtime = await prepareRuntime()

  const res = await runtime.request('/user')
  const status = res.status()
  const statusText = res.statusText()

  expect(status).toBe(401)
  expect(statusText).toBe('Custom text')
})

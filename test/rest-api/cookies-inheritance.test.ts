import * as path from 'path'
import { pageWith } from 'page-with'

test('inherits cookies set on a preceeding request', async () => {
  const { request } = await pageWith({
    example: path.resolve(__dirname, 'cookies-inheritance.mocks.ts'),
  })

  const res = await request('/login', { method: 'POST' }).then(() => {
    return request('/user')
  })

  const status = res.status()
  const json = await res.json()

  expect(status).toBe(200)
  expect(json).toEqual({
    firstName: 'John',
    lastName: 'Maverick',
  })
})

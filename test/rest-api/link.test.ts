import * as path from 'path'
import { runBrowserWith } from '../support/runBrowserWith'

test('mocks response to a basic GET request', async () => {
  const runtime = await runBrowserWith(path.resolve(__dirname, 'link.mocks.ts'))

  const res = await runtime.request({
    url: 'https://api.github.com/users/octocat',
  })
  const body = await res.json()

  expect(res.headers()).toHaveProperty('x-powered-by', 'msw')
  expect(res.status()).toBe(200)
  expect(body).toEqual({
    name: 'John Maverick',
    originalUsername: 'octocat',
  })

  return runtime.cleanup()
})

test('mocks response to a GET request which matches permissive base mask', async () => {
  const runtime = await runBrowserWith(path.resolve(__dirname, 'link.mocks.ts'))

  const res = await runtime.request({
    url: 'https://foo-bar.com/users',
  })
  const body = await res.json()

  expect(res.headers()).toHaveProperty('x-powered-by', 'msw')
  expect(res.status()).toBe(200)
  expect(body).toEqual([
    { login: 'mojombo', id: 1 },
    { login: 'defunkt', id: 2 },
  ])

  return runtime.cleanup()
})

test('mocks response to a GET request which matches RegExp', async () => {
  const runtime = await runBrowserWith(path.resolve(__dirname, 'link.mocks.ts'))

  const res = await runtime.request({
    url: 'https://api.github.com/licenses',
  })
  const body = await res.json()

  expect(res.headers()).toHaveProperty('x-powered-by', 'msw')
  expect(res.status()).toBe(200)
  expect(body).toEqual([
    {
      key: 'agpl-3.0',
      name: 'GNU Affero General Public License v3.0',
      spdx_id: 'AGPL-3.0',
      url: 'https://api.github.com/licenses/agpl-3.0',
      node_id: 'MDc6TGljZW5zZTE=',
    },
  ])

  return runtime.cleanup()
})

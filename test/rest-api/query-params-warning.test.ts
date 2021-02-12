import * as path from 'path'
import { pageWith } from 'page-with'

test('warns when a request handler URL contains query parameters', async () => {
  const { request, consoleSpy } = await pageWith({
    example: path.resolve(__dirname, 'query-params-warning.mocks.ts'),
  })

  expect(consoleSpy.get('warning')).toEqual([
    `\
[MSW] Found a redundant usage of query parameters in the request handler URL for "GET /user?name=admin". Please match against a path instead, and access query parameters in the response resolver function:

rest.get("/user", (req, res, ctx) => {
  const query = req.url.searchParams
  const name = query.get("name")
})\
`,
    `\
[MSW] Found a redundant usage of query parameters in the request handler URL for "POST /login?id=123&type=auth". Please match against a path instead, and access query parameters in the response resolver function:

rest.post("/login", (req, res, ctx) => {
  const query = req.url.searchParams
  const id = query.get("id")
  const type = query.get("type")
})\
`,
  ])

  await request('/user?name=admin').then(async (res) => {
    expect(res.status()).toBe(200)
    expect(await res.text()).toBe('user-response')
  })

  await request('/user').then(async (res) => {
    expect(res.status()).toBe(200)
    expect(await res.text()).toBe('user-response')
  })

  await request('/login?id=123&type=auth', {
    method: 'POST',
  }).then(async (res) => {
    expect(res.status()).toBe(200)
    expect(await res.text()).toBe('login-response')
  })

  await request('/login', {
    method: 'POST',
  }).then(async (res) => {
    expect(res.status()).toBe(200)
    expect(await res.text()).toBe('login-response')
  })
})

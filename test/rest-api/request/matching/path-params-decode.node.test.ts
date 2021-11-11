/**
 * @jest-environment node
 */
import fetch from 'node-fetch'
import { rest } from 'msw'
import { setupServer } from 'msw/node'

const server = setupServer(
  rest.get('https://test.mswjs.io/reflect-url/:url', (req, res, ctx) => {
    const { url } = req.params

    return res(ctx.json({ url }))
  }),
)

beforeAll(() => {
  server.listen()
})

afterAll(() => {
  server.close()
})

test('decodes url componets', async () => {
  const url = 'http://example.com:5001/example'

  const res = await fetch(
    `https://test.mswjs.io/reflect-url/${encodeURIComponent(url)}`,
  )

  expect(res.status).toEqual(200)
  expect(await res.json()).toEqual({
    url,
  })
})

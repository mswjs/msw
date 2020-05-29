import fetch from 'node-fetch'
import { rest } from 'msw'
import { setupServer } from 'msw/node'

const server = setupServer(
  rest.get('https://mswjs.io/books', (req, res, ctx) => {
    return res(ctx.json({ title: 'Original title' }))
  }),
)

beforeAll(() => server.listen())
afterAll(() => server.close())

test('returns a mocked response from the one-time request handler only upon first request', async () => {
  server.use(
    rest.get('https://mswjs.io/books', (req, res, ctx) => {
      return res.once(ctx.json({ title: 'Overridden title' }))
    }),
  )

  const firstResponse = await fetch('https://mswjs.io/books')
  const firstBody = await firstResponse.json()
  expect(firstResponse.status).toBe(200)
  expect(firstBody).toEqual({ title: 'Overridden title' })

  const secondResponse = await fetch('https://mswjs.io/books')
  const secondBody = await secondResponse.json()
  expect(secondResponse.status).toBe(200)
  expect(secondBody).toEqual({ title: 'Original title' })
})

test('returns a mocked response from the used one-time request handler when restored', async () => {
  server.use(
    rest.get('https://mswjs.io/books', (req, res, ctx) => {
      return res.once(ctx.json({ title: 'Overridden title' }))
    }),
  )

  const firstResponse = await fetch('https://mswjs.io/books')
  const firstBody = await firstResponse.json()
  expect(firstResponse.status).toBe(200)
  expect(firstBody).toEqual({ title: 'Overridden title' })

  const secondResponse = await fetch('https://mswjs.io/books')
  const secondBody = await secondResponse.json()
  expect(secondResponse.status).toBe(200)
  expect(secondBody).toEqual({ title: 'Original title' })

  server.restoreHandlers()

  const thirdResponse = await fetch('https://mswjs.io/books')
  const thirdBody = await thirdResponse.json()
  expect(firstResponse.status).toBe(200)
  expect(thirdBody).toEqual({ title: 'Overridden title' })
})

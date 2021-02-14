/**
 * @jest-environment node
 */
import fetch from 'node-fetch'
import { rest } from 'msw'
import { setupServer } from 'msw/node'

const server = setupServer(
  rest.post('https://api.test.com/login', (req, res, ctx) => {
    return res(ctx.cookie('authToken', 'abc-123'))
  }),
  rest.get('https://api.test.com/user', (req, res, ctx) => {
    if (req.cookies.authToken == null) {
      return res(
        ctx.status(403),
        ctx.json({
          error: 'Auth token not found',
        }),
      )
    }

    return res(
      ctx.json({
        firstName: 'John',
        lastName: 'Maverick',
      }),
    )
  }),
)

beforeAll(() => {
  server.listen()
})

afterAll(() => {
  server.close()
})

test('inherits cookies set on a preceeding request', async () => {
  const res = await fetch('https://api.test.com/login', {
    method: 'POST',
  }).then(() => {
    return fetch('https://api.test.com/user')
  })
  const json = await res.json()

  expect(res.status).toBe(200)
  expect(json).toEqual({
    firstName: 'John',
    lastName: 'Maverick',
  })
})

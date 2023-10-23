import fetch from 'node-fetch'
import { HttpResponse, http } from 'msw'
import { setupServer } from 'msw/node'

const server = setupServer(
  http.get('http://test.mswjs.io', () => {
    return HttpResponse.json(
      {
        firstName: 'John',
        age: 32,
      },
      {
        status: 401,
        headers: {
          'X-Header': 'yes',
        },
      },
    )
  }),
  http.post('https://test.mswjs.io', async ({ request }) => {
    return HttpResponse.json(await request.json(), {
      status: 403,
      headers: {
        'X-Header': 'yes',
      },
    })
  }),
)

beforeAll(() => {
  server.listen()
})

afterAll(() => {
  server.close()
})

it('returns a mocked response to a GET request using fetch', async () => {
  const res = await fetch('http://test.mswjs.io')

  expect(res.status).toEqual(401)
  expect(res.headers.get('content-type')).toEqual('application/json')
  expect(res.headers.get('x-header')).toEqual('yes')

  expect(await res.json()).toEqual({
    firstName: 'John',
    age: 32,
  })
})

it('returns a mocked response to a POST request using fetch', async () => {
  const res = await fetch('https://test.mswjs.io', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      payload: 'info',
    }),
  })

  expect(res.status).toEqual(403)
  expect(res.headers.get('content-type')).toEqual('application/json')
  expect(res.headers.get('x-header')).toEqual('yes')
  expect(await res.json()).toEqual({
    payload: 'info',
  })
})

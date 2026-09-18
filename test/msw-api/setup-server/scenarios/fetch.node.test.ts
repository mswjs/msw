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

test('returns a mocked response to a GET request using fetch', async () => {
  const response = await fetch('http://test.mswjs.io')

  expect(response.status).toEqual(401)
  expect(response.headers.get('content-type')).toEqual('application/json')
  expect(response.headers.get('x-header')).toEqual('yes')

  expect(await response.json()).toEqual({
    firstName: 'John',
    age: 32,
  })
})

test('returns a mocked response to a POST request using fetch', async () => {
  const response = await fetch('https://test.mswjs.io', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      payload: 'info',
    }),
  })

  expect(response.status).toEqual(403)
  expect(response.headers.get('content-type')).toEqual('application/json')
  expect(response.headers.get('x-header')).toEqual('yes')
  expect(await response.json()).toEqual({
    payload: 'info',
  })
})

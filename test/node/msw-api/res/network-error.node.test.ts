/**
 * @jest-environment node
 */
import fetch from 'node-fetch'
import { rest, NetworkError } from 'msw'
import { setupServer } from 'msw/node'

const server = setupServer()

beforeAll(() => server.listen())
afterAll(() => server.close())

test('throws a network error when used with fetch', async () => {
  server.use(
    rest.get('http://test.io/user', () => {
      throw new NetworkError('Custom network error message')
    }),
  )

  await expect(fetch('http://test.io/user')).rejects.toThrow(
    'Custom network error message',
  )
})

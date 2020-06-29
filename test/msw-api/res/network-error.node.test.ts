/**
 * @jest-environment node
 */
import { rest } from 'msw'
import { setupServer } from 'msw/node'
import fetch from 'node-fetch'

const server = setupServer()

beforeAll(() => server.listen())
afterAll(() => server.close())

test('res.networkError causes Fetch API to throw error', async () => {
  server.use(
    rest.get('https://api.backend.com/path', (_, res) => {
      return res.networkError()
    }),
  )

  expect(fetch('https://api.backend.com/path')).toThrow(
    'Mocked network error message',
  )
})

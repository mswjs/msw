// @vitest-environment node
import { setupServer } from 'msw/node'

const server = setupServer()

beforeAll(() => {
  server.listen()
})

afterAll(() => {
  server.close()
})

test('throws if "server.listen()" is called multiple times', () => {
  expect(() => server.listen()).toThrow(
    '[MSW] Failed to call "server.listen()": the server is already listening. Remove the redundant "server.listen()" call.',
  )
})

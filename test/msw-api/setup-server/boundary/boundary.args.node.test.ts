// @vitest-environment node
import { setupServer } from 'msw/node'

const server = setupServer()

beforeAll(() => {
  server.listen()
})

afterAll(() => {
  server.close()
})

it.concurrent('forwards arguments to the callback function', async () => {
  server.boundary((...args) => {
    expect(args).toEqual([1, { 2: true }, [3]])
  })(1, { 2: true }, [3])
})

it.concurrent('returns the result of the callback function', async () => {
  const result = server.boundary((number: number) => {
    return number * 10
  })(2)

  expect(result).toBe(20)
})

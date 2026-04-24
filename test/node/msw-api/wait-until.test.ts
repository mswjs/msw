// @vitest-environment node
import { http, passthrough } from 'msw'
import { setupServer } from 'msw/node'
import { setTimeout } from 'node:timers/promises'

const server = setupServer()

beforeAll(() => {
  server.listen()
})

afterEach(() => {
  server.resetHandlers()
})

afterAll(() => {
  server.close()
})

it('runs the effect after a handler that returns nothing', async () => {
  const effect = vi.fn()

  server.use(
    http.get('http://localhost/resource', ({ waitUntil }) => {
      waitUntil(effect)
    }),
  )

  await fetch('http://localhost/resource').catch(() => {})
  expect(effect).toHaveBeenCalledOnce()
})

it('runs the effect after a handler that returns a response', async () => {
  const effect = vi.fn()

  server.use(
    http.get('http://localhost/resource', ({ waitUntil }) => {
      waitUntil(effect)
      return new Response()
    }),
  )

  await fetch('http://localhost/resource')
  expect(effect).toHaveBeenCalledOnce()
})

it('runs the effect after a handler that throws a response', async () => {
  const effect = vi.fn()

  server.use(
    http.get('http://localhost/resource', ({ waitUntil }) => {
      waitUntil(effect)
      throw new Response()
    }),
  )

  await fetch('http://localhost/resource')
  expect(effect).toHaveBeenCalledOnce()
})

it('runs the effect after a handler that passes through', async () => {
  const effect = vi.fn()

  server.use(
    http.get('http://localhost/resource', ({ waitUntil }) => {
      waitUntil(effect)
      return passthrough()
    }),
  )

  await fetch('http://localhost/resource').catch(() => {})
  expect(effect).toHaveBeenCalledOnce()
})

it('runs an asynchronous effect before the response is returned', async () => {
  const effect = vi.fn()

  server.use(
    http.get('http://localhost/resource', ({ waitUntil }) => {
      waitUntil(async () => {
        await setTimeout(250)
        effect()
      })

      return new Response()
    }),
  )

  await fetch('http://localhost/resource').catch(() => {})
  expect(effect).toHaveBeenCalledOnce()
})

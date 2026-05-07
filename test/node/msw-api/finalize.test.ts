// @vitest-environment node
import { http, passthrough } from 'msw'
import { setupServer } from 'msw/node'
import { setTimeout } from 'node:timers/promises'

const server = setupServer()

beforeAll(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {})
  server.listen()
})

afterEach(() => {
  vi.clearAllMocks()
  server.resetHandlers()
})

afterAll(() => {
  vi.restoreAllMocks()
  server.close()
})

it('runs after a handler that returns nothing', async () => {
  const cleanup = vi.fn()

  server.use(
    http.get('http://localhost/resource', ({ finalize }) => {
      finalize(cleanup)
    }),
  )

  await fetch('http://localhost/resource').catch(() => {})
  expect(cleanup).toHaveBeenCalledOnce()
})

it('runs after a handler returns a response', async () => {
  const cleanup = vi.fn()

  server.use(
    http.get('http://localhost/resource', ({ finalize }) => {
      finalize(cleanup)
      return new Response()
    }),
  )

  await fetch('http://localhost/resource')
  expect(cleanup).toHaveBeenCalledOnce()
})

it('runs after a handler that throws a response', async () => {
  const cleanup = vi.fn()

  server.use(
    http.get('http://localhost/resource', ({ finalize }) => {
      finalize(cleanup)
      throw new Response()
    }),
  )

  await fetch('http://localhost/resource')
  expect(cleanup).toHaveBeenCalledOnce()
})

it('runs after a handler that throws an error', async () => {
  const cleanup = vi.fn()

  server.use(
    http.get('http://localhost/resource', ({ finalize }) => {
      finalize(cleanup)
      throw new Error('Custom reason')
    }),
  )

  await fetch('http://localhost/resource').catch(() => {})
  expect(cleanup).toHaveBeenCalledOnce()
})

it('runs after a handler that passes through', async () => {
  const cleanup = vi.fn()

  server.use(
    http.get('http://localhost/resource', ({ finalize }) => {
      finalize(cleanup)
      return passthrough()
    }),
  )

  await fetch('http://localhost/resource').catch(() => {})
  expect(cleanup).toHaveBeenCalledOnce()
})

it('runs an asynchronous cleanup before the response is returned', async () => {
  const cleanup = vi.fn()

  server.use(
    http.get('http://localhost/resource', ({ finalize }) => {
      finalize(async () => {
        await setTimeout(250)
        cleanup()
      })

      return new Response()
    }),
  )

  const responseReceived = vi.fn()
  await fetch('http://localhost/resource').then(responseReceived)
  expect(cleanup).toHaveBeenCalledOnce()
  expect(cleanup).toHaveBeenCalledBefore(responseReceived)
})

it('runs multiple cleanups as LIFO', async () => {
  const cleanupOne = vi.fn()
  const cleanupTwo = vi.fn()

  server.use(
    http.get('http://localhost/resource', ({ finalize }) => {
      finalize(cleanupOne)
      finalize(cleanupTwo)
      return new Response()
    }),
  )

  await fetch('http://localhost/resource')
  expect(cleanupOne).toHaveBeenCalledOnce()
  expect(cleanupTwo).toHaveBeenCalledOnce()
  expect(cleanupTwo).toHaveBeenCalledBefore(cleanupOne)
})

it('runs after the request has been aborted', async () => {
  const cleanup = vi.fn()

  server.use(
    http.get('http://localhost/resource', async ({ finalize }) => {
      finalize(cleanup)
      await setTimeout(250)
      return new Response()
    }),
  )

  const controller = new AbortController()
  const responsePromise = fetch('http://localhost/resource', {
    signal: controller.signal,
  })
  await setTimeout(100)
  controller.abort()

  await expect(responsePromise).rejects.toThrow()
  expect(cleanup).toHaveBeenCalledOnce()
})

it('runs once the generator resolver is exhausted', async () => {
  const cleanup = vi.fn()

  server.use(
    http.get('http://localhost/resource', function* ({ finalize }) {
      finalize(cleanup)

      yield new Response('yield')
      return new Response('final')
    }),
  )

  {
    const response = await fetch('http://localhost/resource')
    await expect(response.text()).resolves.toBe('yield')
    expect(cleanup).not.toHaveBeenCalled()
  }

  {
    const response = await fetch('http://localhost/resource')
    await expect(response.text()).resolves.toBe('final')
    expect(cleanup).toHaveBeenCalled()
  }

  {
    const response = await fetch('http://localhost/resource')
    await expect(response.text()).resolves.toBe('final')
    expect(cleanup).toHaveBeenCalledOnce()
  }
})

it('runs once the returned iterator is exhausted', async () => {
  const cleanup = vi.fn()

  server.use(
    http.get('http://localhost/resource', async ({ finalize }) => {
      finalize(cleanup)

      /**
       * @note This is an edge case, but it's, technically, allowed.
       */
      return (async function* () {
        yield new Response('yield')
        return new Response('final')
      })()
    }),
  )

  {
    const response = await fetch('http://localhost/resource')
    await expect(response.text()).resolves.toBe('yield')
    expect(cleanup).not.toHaveBeenCalled()
  }

  {
    const response = await fetch('http://localhost/resource')
    await expect(response.text()).resolves.toBe('final')
    expect(cleanup).toHaveBeenCalled()
  }

  {
    const response = await fetch('http://localhost/resource')
    await expect(response.text()).resolves.toBe('final')
    expect(cleanup).toHaveBeenCalledOnce()
  }
})

it('runs cleanup for parallel requests', async () => {
  const cleanup = vi.fn()

  server.use(
    http.get('http://localhost/resource', ({ finalize }) => {
      finalize(cleanup)
      return new Response()
    }),
  )

  await Promise.all([
    fetch('http://localhost/resource'),
    fetch('http://localhost/resource'),
  ])

  expect(cleanup).toHaveBeenCalledTimes(2)
})

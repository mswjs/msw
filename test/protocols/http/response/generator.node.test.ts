// @vitest-environment node
import { http, HttpResponse, delay } from 'msw'
import { setupServer } from 'msw/node'

const server = setupServer()

async function fetchJson(input: string | URL | Request, init?: RequestInit) {
  return fetch(input, init).then((response) => response.json())
}

beforeAll(() => {
  server.listen()
})

afterEach(() => {
  vi.resetAllMocks()
  server.resetHandlers()
})

afterAll(() => {
  vi.restoreAllMocks()
  server.close()
})

it('supports generator function as response resolver', async () => {
  server.use(
    http.get('http://localhost/weather', function* () {
      let degree = 10

      while (degree < 13) {
        degree++
        yield HttpResponse.json(degree)
      }

      degree++
      return HttpResponse.json(degree)
    }),
  )

  // Must respond with yielded responses.
  await expect(fetchJson('http://localhost/weather')).resolves.toBe(11)
  await expect(fetchJson('http://localhost/weather')).resolves.toBe(12)
  await expect(fetchJson('http://localhost/weather')).resolves.toBe(13)
  // Must respond with the final "done" response.
  await expect(fetchJson('http://localhost/weather')).resolves.toBe(14)
  // Must keep responding with the final "done" response.
  await expect(fetchJson('http://localhost/weather')).resolves.toBe(14)
})

it('supports async generator function as response resolver', async () => {
  server.use(
    http.get('http://localhost/weather', async function* () {
      await delay(20)

      let degree = 10

      while (degree < 13) {
        degree++
        yield HttpResponse.json(degree)
      }

      degree++
      return HttpResponse.json(degree)
    }),
  )

  await expect(fetchJson('http://localhost/weather')).resolves.toBe(11)
  await expect(fetchJson('http://localhost/weather')).resolves.toBe(12)
  await expect(fetchJson('http://localhost/weather')).resolves.toBe(13)
  await expect(fetchJson('http://localhost/weather')).resolves.toBe(14)
  await expect(fetchJson('http://localhost/weather')).resolves.toBe(14)
})

it('supports generator function as one-time response resolver', async () => {
  server.use(
    http.get(
      'http://localhost/weather',
      function* () {
        let degree = 10

        while (degree < 13) {
          degree++
          yield HttpResponse.json(degree)
        }

        degree++
        return HttpResponse.json(degree)
      },
      { once: true },
    ),
    http.get('*', () => {
      return HttpResponse.json('fallback')
    }),
  )

  // Must respond with the yielded incrementing responses.
  await expect(fetchJson('http://localhost/weather')).resolves.toBe(11)
  await expect(fetchJson('http://localhost/weather')).resolves.toBe(12)
  await expect(fetchJson('http://localhost/weather')).resolves.toBe(13)
  // Must respond with the "done" final response from the iterator.
  await expect(fetchJson('http://localhost/weather')).resolves.toBe(14)
  // Must respond with the other handler since the generator one is used.
  await expect(fetchJson('http://localhost/weather')).resolves.toBe('fallback')
  await expect(fetchJson('http://localhost/weather')).resolves.toBe('fallback')
})

it('resets the generator state after the handlers are reset', async () => {
  server.use(
    http.get('http://localhost/resource', function* () {
      yield HttpResponse.json('Yield')
      return HttpResponse.json('Stable')
    }),
  )

  await server.boundary(async () => {
    await expect(fetchJson('http://localhost/resource')).resolves.toBe('Yield')
    await expect(fetchJson('http://localhost/resource')).resolves.toBe('Stable')

    server.resetHandlers()

    await expect(fetchJson('http://localhost/resource')).resolves.toBe('Yield')
    await expect(fetchJson('http://localhost/resource')).resolves.toBe('Stable')
  })()
})

it('resets the generator state of one-time handlers after the handlers are restored', async () => {
  server.use(
    http.get(
      'http://localhost/resource',
      function* () {
        yield HttpResponse.json('Yield')
        return HttpResponse.json('Stable')
      },
      { once: true },
    ),
  )

  await server.boundary(async () => {
    await expect(fetchJson('http://localhost/resource')).resolves.toBe('Yield')
    await expect(fetchJson('http://localhost/resource')).resolves.toBe('Stable')

    server.restoreHandlers()

    /**
     * @note A generator has to be exhausted before it's marked as fully used.
     */
    await expect(fetchJson('http://localhost/resource')).resolves.toBe('Yield')
    await expect(fetchJson('http://localhost/resource')).resolves.toBe('Stable')
  })()
})

it('does nothing when restoring regular handlers', async () => {
  server.use(
    http.get('http://localhost/resource', function* () {
      yield HttpResponse.json('Yield')
      return HttpResponse.json('Stable')
    }),
  )

  await server.boundary(async () => {
    await expect(fetchJson('http://localhost/resource')).resolves.toBe('Yield')
    await expect(fetchJson('http://localhost/resource')).resolves.toBe('Stable')

    server.restoreHandlers()

    await expect(fetchJson('http://localhost/resource')).resolves.toBe('Stable')
    await expect(fetchJson('http://localhost/resource')).resolves.toBe('Stable')
  })()
})

it('calls generator cleanup', async () => {
  const cleanup = vi.fn()

  server.use(
    http.get('http://localhost/resource', function* () {
      try {
        yield HttpResponse.json('Yield')
        return HttpResponse.json('Stable')
      } finally {
        cleanup()
      }
    }),
  )

  await expect(fetchJson('http://localhost/resource')).resolves.toBe('Yield')
  expect(cleanup).not.toHaveBeenCalled()

  await expect(fetchJson('http://localhost/resource')).resolves.toBe('Stable')
  await expect.poll(() => cleanup).toHaveBeenCalledOnce()

  await expect(fetchJson('http://localhost/resource')).resolves.toBe('Stable')
  await expect.poll(() => cleanup).toHaveBeenCalledOnce()
})

it('calls async generator cleanup', async () => {
  const cleanup = vi.fn(async () => {})

  server.use(
    http.get('http://localhost/resource', async function* () {
      try {
        yield HttpResponse.json('Yield')
        return HttpResponse.json('Stable')
      } finally {
        await cleanup()
      }
    }),
  )

  await expect(fetchJson('http://localhost/resource')).resolves.toBe('Yield')
  expect(cleanup).not.toHaveBeenCalled()

  await expect(fetchJson('http://localhost/resource')).resolves.toBe('Stable')
  await expect.poll(() => cleanup).toHaveBeenCalledOnce()

  await expect(fetchJson('http://localhost/resource')).resolves.toBe('Stable')
  await expect.poll(() => cleanup).toHaveBeenCalledOnce()
})

it('forwards generator cleanup errors', async () => {
  vi.spyOn(console, 'error').mockImplementation(() => {})

  const error = new Error('Reason')
  const cleanup = vi.fn(() => {
    throw error
  })

  server.use(
    http.get('http://localhost/resource', function* () {
      try {
        yield HttpResponse.json('Yield')
        return HttpResponse.json('Stable')
      } finally {
        cleanup()
      }
    }),
  )

  await expect(fetchJson('http://localhost/resource')).resolves.toBe('Yield')
  expect(cleanup).not.toHaveBeenCalled()

  await expect(
    fetchJson('http://localhost/resource'),
    'Receives a coerced error response',
  ).resolves.toEqual(
    expect.objectContaining({
      name: 'Error',
      message: 'Reason',
    }),
  )
  await expect.poll(() => cleanup).toHaveBeenCalledOnce()
  await expect.poll(() => console.error).toHaveBeenCalledWith(error)
  expect(console.error).toHaveBeenCalledWith(
    `[MSW] Encountered an unhandled exception during the handler lookup for "GET http://localhost/resource". Please see the original error above.`,
  )
})

it('calls generator cleanup when resetting a mid-flight generator', async () => {
  const cleanup = vi.fn()

  server.use(
    http.get('http://localhost/resource', function* () {
      try {
        yield HttpResponse.json('Yield')
        return HttpResponse.json('Stable')
      } finally {
        cleanup()
      }
    }),
  )

  await server.boundary(async () => {
    await expect(fetchJson('http://localhost/resource')).resolves.toBe('Yield')
    expect(cleanup).not.toHaveBeenCalled()

    server.resetHandlers()

    expect(cleanup).toHaveBeenCalledOnce()
  })()
})

it('does not call generator cleanup when resetting an exhausted generator', async () => {
  const cleanup = vi.fn()

  server.use(
    http.get('http://localhost/resource', function* () {
      try {
        yield HttpResponse.json('Yield')
        return HttpResponse.json('Stable')
      } finally {
        cleanup()
      }
    }),
  )

  await server.boundary(async () => {
    await expect(fetchJson('http://localhost/resource')).resolves.toBe('Yield')
    expect(cleanup).not.toHaveBeenCalled()

    await expect(fetchJson('http://localhost/resource')).resolves.toBe('Stable')
    expect(cleanup).toHaveBeenCalledOnce()

    server.resetHandlers()

    await new Promise((resolve) => setImmediate(resolve))
    expect(cleanup).toHaveBeenCalledOnce()
  })()
})

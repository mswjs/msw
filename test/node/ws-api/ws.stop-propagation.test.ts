// @vitest-environment node-websocket
import { ws } from 'msw'
import { setupServer } from 'msw/node'
import { WebSocketServer } from '../../support/WebSocketServer'

const server = setupServer()
const service = ws.link('ws://*')

const originalServer = new WebSocketServer()

beforeAll(async () => {
  server.listen({
    // We are intentionally connecting to non-existing WebSocket URLs.
    // Skip the unhandled request warnings, they are intentional.
    onUnhandledRequest: 'bypass',
  })
  await originalServer.listen()
})

afterEach(() => {
  server.resetHandlers()
  originalServer.resetState()
})

afterAll(async () => {
  server.close()
  await originalServer.close()
})

it('stops propagation for client "message" event', async () => {
  const clientMessageListener = vi.fn<(input: number) => void>()

  server.use(
    service.addEventListener('connection', ({ client }) => {
      client.addEventListener('message', (event) => {
        // Calling `stopPropagation` will prevent this event from being
        // dispatched on the `client` belonging to a different event handler.
        event.stopPropagation()
        clientMessageListener(1)
      })

      client.addEventListener('message', () => {
        clientMessageListener(2)
      })
    }),

    service.addEventListener('connection', ({ client }) => {
      client.addEventListener('message', () => {
        clientMessageListener(3)
      })
    }),

    service.addEventListener('connection', ({ client }) => {
      client.addEventListener('message', () => {
        clientMessageListener(4)
      })

      process.nextTick(() => {
        client.close()
      })
    }),
  )

  const ws = new WebSocket('ws://localhost')
  ws.onopen = () => ws.send('hello world')

  await vi.waitFor(() => {
    expect(ws.readyState).toBe(WebSocket.CLOSED)
  })

  expect(clientMessageListener).toHaveBeenNthCalledWith(1, 1)
  expect(clientMessageListener).toHaveBeenNthCalledWith(2, 2)
  expect(clientMessageListener).toHaveBeenCalledTimes(2)
})

it('stops immediate propagation for client "message" event', async () => {
  const clientMessageListener = vi.fn<(input: number) => void>()

  server.use(
    service.addEventListener('connection', ({ client }) => {
      client.addEventListener('message', (event) => {
        // Calling `stopPropagation` will prevent this event from being
        // dispatched on the `client` belonging to a different event handler.
        event.stopImmediatePropagation()
        clientMessageListener(1)
      })

      client.addEventListener('message', () => {
        clientMessageListener(2)
      })

      client.addEventListener('message', () => {
        clientMessageListener(3)
      })
    }),

    service.addEventListener('connection', ({ client }) => {
      client.addEventListener('message', () => {
        clientMessageListener(4)
      })

      process.nextTick(() => {
        client.close()
      })
    }),
  )

  const ws = new WebSocket('ws://localhost')
  ws.onopen = () => ws.send('hello world')

  await vi.waitFor(() => {
    expect(ws.readyState).toBe(WebSocket.CLOSED)
  })

  expect(clientMessageListener).toHaveBeenNthCalledWith(1, 1)
  expect(clientMessageListener).toHaveBeenCalledOnce()
})

it('stops propagation for server "open" event', async () => {
  const serverOpenListener = vi.fn<(input: number) => void>()

  originalServer.addListener('connection', () => {})

  server.use(
    service.addEventListener('connection', ({ client, server }) => {
      server.connect()

      server.addEventListener('open', (event) => {
        // Calling `stopPropagation` will prevent this event from being
        // dispatched on the `server` belonging to a different event handler.
        event.stopPropagation()
        serverOpenListener(1)

        process.nextTick(() => client.close())
      })

      server.addEventListener('open', () => {
        serverOpenListener(2)
      })
    }),

    service.addEventListener('connection', ({ server }) => {
      server.addEventListener('open', () => {
        serverOpenListener(3)
      })
    }),

    service.addEventListener('connection', ({ server }) => {
      server.addEventListener('open', () => {
        serverOpenListener(4)
      })
    }),
  )

  const ws = new WebSocket(originalServer.url)

  await vi.waitFor(() => {
    expect(ws.readyState).toBe(WebSocket.CLOSED)
  })

  expect(serverOpenListener).toHaveBeenNthCalledWith(1, 1)
  expect(serverOpenListener).toHaveBeenNthCalledWith(2, 2)
  expect(serverOpenListener).toHaveBeenCalledTimes(2)
})

it('stops immediate propagation for server "open" event', async () => {
  const serverOpenListener = vi.fn<(input: number) => void>()

  originalServer.addListener('connection', () => {})

  server.use(
    service.addEventListener('connection', ({ client, server }) => {
      server.connect()

      server.addEventListener('open', (event) => {
        event.stopImmediatePropagation()
        serverOpenListener(1)

        process.nextTick(() => client.close())
      })

      server.addEventListener('open', () => {
        serverOpenListener(2)
      })
    }),

    service.addEventListener('connection', ({ server }) => {
      server.addEventListener('open', () => {
        serverOpenListener(3)
      })
    }),

    service.addEventListener('connection', ({ server }) => {
      server.addEventListener('open', () => {
        serverOpenListener(4)
      })
    }),
  )

  const ws = new WebSocket(originalServer.url)

  await vi.waitFor(() => {
    expect(ws.readyState).toBe(WebSocket.CLOSED)
  })

  expect(serverOpenListener).toHaveBeenNthCalledWith(1, 1)
  expect(serverOpenListener).toHaveBeenCalledOnce()
})

it('stops propagation for server "message" event', async () => {
  const serverMessageListener = vi.fn<(input: number) => void>()

  originalServer.addListener('connection', (ws) => {
    // Send data from the original server to trigger the "message" event.
    ws.send('hello')
  })

  server.use(
    service.addEventListener('connection', ({ client, server }) => {
      server.connect()

      server.addEventListener('message', (event) => {
        // Calling `stopPropagation` will prevent this event from being
        // dispatched on the `server` belonging to a different event handler.
        event.stopPropagation()
        serverMessageListener(1)

        process.nextTick(() => client.close())
      })

      server.addEventListener('message', () => {
        serverMessageListener(2)
      })
    }),

    service.addEventListener('connection', ({ server }) => {
      server.addEventListener('message', () => {
        serverMessageListener(3)
      })
    }),

    service.addEventListener('connection', ({ server }) => {
      server.addEventListener('message', () => {
        serverMessageListener(4)
      })
    }),
  )

  const ws = new WebSocket(originalServer.url)

  await vi.waitFor(() => {
    expect(ws.readyState).toBe(WebSocket.CLOSED)
  })

  expect(serverMessageListener).toHaveBeenNthCalledWith(1, 1)
  expect(serverMessageListener).toHaveBeenNthCalledWith(2, 2)
  expect(serverMessageListener).toHaveBeenCalledTimes(2)
})

it('stops immediate propagation for server "message" event', async () => {
  const serverMessageListener = vi.fn<(input: number) => void>()

  originalServer.addListener('connection', (ws) => {
    // Send data from the original server to trigger the "message" event.
    ws.send('hello')
  })

  server.use(
    service.addEventListener('connection', ({ client, server }) => {
      server.connect()

      server.addEventListener('message', (event) => {
        event.stopImmediatePropagation()
        serverMessageListener(1)

        process.nextTick(() => client.close())
      })

      server.addEventListener('message', () => {
        serverMessageListener(2)
      })
    }),

    service.addEventListener('connection', ({ server }) => {
      server.addEventListener('message', () => {
        serverMessageListener(3)
      })
    }),

    service.addEventListener('connection', ({ server }) => {
      server.addEventListener('message', () => {
        serverMessageListener(4)
      })
    }),
  )

  const ws = new WebSocket(originalServer.url)

  await vi.waitFor(() => {
    expect(ws.readyState).toBe(WebSocket.CLOSED)
  })

  expect(serverMessageListener).toHaveBeenNthCalledWith(1, 1)
  expect(serverMessageListener).toHaveBeenCalledOnce()
})

it('stops propagation for server "error" event', async () => {
  const serverErrorListener = vi.fn<(input: number) => void>()

  server.use(
    service.addEventListener('connection', ({ client, server }) => {
      server.connect()

      server.addEventListener('error', (event) => {
        event.stopPropagation()
        serverErrorListener(1)
      })

      server.addEventListener('error', () => {
        serverErrorListener(2)
      })
    }),

    service.addEventListener('connection', ({ server }) => {
      server.addEventListener('error', () => {
        serverErrorListener(3)
      })
    }),

    service.addEventListener('connection', ({ server }) => {
      server.addEventListener('error', () => {
        serverErrorListener(4)
      })
    }),
  )

  const ws = new WebSocket('ws://localhost/non-existing-path')

  await vi.waitFor(() => {
    /**
     * @note Ideally, await the "CLOSED" ready state,
     * but Node.js doesn't dispatch it correctly.
     * @see https://github.com/nodejs/undici/issues/3697
     */
    return new Promise<void>((resolve) => {
      ws.onerror = () => resolve()
    })
  })

  expect(serverErrorListener).toHaveBeenNthCalledWith(1, 1)
  expect(serverErrorListener).toHaveBeenNthCalledWith(2, 2)
  expect(serverErrorListener).toHaveBeenCalledTimes(2)
})

it('stops immediate propagation for server "error" event', async () => {
  const serverErrorListener = vi.fn<(input: number) => void>()

  server.use(
    service.addEventListener('connection', ({ client, server }) => {
      server.connect()

      server.addEventListener('error', (event) => {
        event.stopImmediatePropagation()
        serverErrorListener(1)
      })

      server.addEventListener('error', () => {
        serverErrorListener(2)
      })
    }),

    service.addEventListener('connection', ({ server }) => {
      server.addEventListener('error', () => {
        serverErrorListener(3)
      })
    }),

    service.addEventListener('connection', ({ server }) => {
      server.addEventListener('error', () => {
        serverErrorListener(4)
      })
    }),
  )

  const ws = new WebSocket('ws://localhost/non-existing-path')

  await vi.waitFor(() => {
    /**
     * @note Ideally, await the "CLOSED" ready state,
     * but Node.js doesn't dispatch it correctly.
     * @see https://github.com/nodejs/undici/issues/3697
     */
    return new Promise<void>((resolve) => {
      ws.onerror = () => resolve()
    })
  })

  expect(serverErrorListener).toHaveBeenNthCalledWith(1, 1)
  expect(serverErrorListener).toHaveBeenCalledOnce()
})

it('stops propagation for server "close" event', async () => {
  const serverCloseListener = vi.fn<(input: number) => void>()

  originalServer.addListener('connection', (ws) => {
    ws.close()
  })

  server.use(
    service.addEventListener('connection', ({ client, server }) => {
      server.connect()

      server.addEventListener('close', (event) => {
        event.stopPropagation()
        serverCloseListener(1)

        process.nextTick(() => client.close())
      })

      server.addEventListener('close', () => {
        serverCloseListener(2)
      })
    }),

    service.addEventListener('connection', ({ server }) => {
      server.addEventListener('close', () => {
        serverCloseListener(3)
      })
    }),

    service.addEventListener('connection', ({ server }) => {
      server.addEventListener('close', () => {
        serverCloseListener(4)
      })
    }),
  )

  const ws = new WebSocket(originalServer.url)

  await vi.waitFor(() => {
    expect(ws.readyState).toBe(WebSocket.CLOSED)
  })

  expect(serverCloseListener).toHaveBeenNthCalledWith(1, 1)
  expect(serverCloseListener).toHaveBeenNthCalledWith(2, 2)
  expect(serverCloseListener).toHaveBeenCalledTimes(2)
})

it('stops immediate propagation for server "close" event', async () => {
  const serverCloseListener = vi.fn<(input: number) => void>()

  originalServer.addListener('connection', (ws) => {
    ws.close()
  })

  server.use(
    service.addEventListener('connection', ({ client, server }) => {
      server.connect()

      server.addEventListener('close', (event) => {
        event.stopImmediatePropagation()
        serverCloseListener(1)

        process.nextTick(() => client.close())
      })

      server.addEventListener('close', () => {
        serverCloseListener(2)
      })
    }),

    service.addEventListener('connection', ({ server }) => {
      server.addEventListener('close', () => {
        serverCloseListener(3)
      })
    }),

    service.addEventListener('connection', ({ server }) => {
      server.addEventListener('close', () => {
        serverCloseListener(4)
      })
    }),
  )

  const ws = new WebSocket(originalServer.url)

  await vi.waitFor(() => {
    expect(ws.readyState).toBe(WebSocket.CLOSED)
  })

  expect(serverCloseListener).toHaveBeenNthCalledWith(1, 1)
  expect(serverCloseListener).toHaveBeenCalledOnce()
})

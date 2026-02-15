// @vitest-environment node-websocket
import { http, HttpResponse, ws } from 'msw'
import { setupServer } from 'msw/node'

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

it('treats unhandled exceptions in request handlers as 500 error responses', async () => {
  server.use(
    http.get('http://localhost/resource', () => {
      throw new Error('Resolver error')
    }),
  )

  const response = await fetch('http://localhost/resource')

  expect.soft(response.status).toBe(500)
  expect.soft(response.statusText).toBe('Unhandled Exception')
  await expect(response.json()).resolves.toEqual({
    name: 'Error',
    message: 'Resolver error',
    stack: expect.any(String),
  })
})

it('treats unhandled exceptions in event handlers as 1011 socket closures', async () => {
  const api = ws.link('ws://localhost/socket')

  server.use(
    api.addEventListener('connection', () => {
      throw new Error('Resolver error')
    }),
  )

  const socket = new WebSocket('ws://localhost/socket')
  const openListener = vi.fn()
  const closeListener = vi.fn()
  const errorListener = vi.fn()
  socket.onopen = openListener
  socket.onclose = closeListener
  socket.onerror = errorListener

  await expect.poll(() => socket.readyState).toBe(WebSocket.CLOSED)
  expect.soft(openListener).not.toHaveBeenCalled()

  expect.soft(closeListener).toHaveBeenCalledTimes(1)
  expect(closeListener).toHaveBeenCalledWith(
    expect.objectContaining({
      type: 'close',
      code: 1011,
      wasClean: false,
      reason: 'Resolver error',
      target: socket,
    }),
  )

  expect.soft(errorListener).toHaveBeenCalledTimes(1)
  expect(errorListener).toHaveBeenCalledWith(
    expect.objectContaining({
      type: 'error',
      target: socket,
    }),
  )
})

it('short-circuits on the unhandled exception in multiple matching request handlers', async () => {
  server.use(
    http.get('http://localhost/resource', () => {
      throw new Error('Resolver error')
    }),
    http.get('http://localhost/resource', () => {
      return HttpResponse.text('mocked')
    }),
  )

  const response = await fetch('http://localhost/resource')

  expect.soft(response.status).toBe(500)
  expect.soft(response.statusText).toBe('Unhandled Exception')
  await expect(response.json()).resolves.toEqual({
    name: 'Error',
    message: 'Resolver error',
    stack: expect.any(String),
  })
})

it('short-circuits on the unhandled exception in multiple matching event handlers', async () => {
  const api = ws.link('ws://localhost/socket')

  server.use(
    api.addEventListener('connection', () => {
      throw new Error('Resolver error')
    }),
    api.addEventListener('connection', ({ client }) => {
      client.send('mocked')
    }),
  )

  const socket = new WebSocket('ws://localhost/socket')
  const openListener = vi.fn()
  const closeListener = vi.fn()
  const errorListener = vi.fn()
  socket.onopen = openListener
  socket.onclose = closeListener
  socket.onerror = errorListener

  await expect.poll(() => socket.readyState).toBe(WebSocket.CLOSED)
  expect.soft(openListener).not.toHaveBeenCalled()

  expect.soft(closeListener).toHaveBeenCalledTimes(1)
  expect(closeListener).toHaveBeenCalledWith(
    expect.objectContaining({
      type: 'close',
      code: 1011,
      wasClean: false,
      reason: 'Resolver error',
      target: socket,
    }),
  )

  expect.soft(errorListener).toHaveBeenCalledTimes(1)
  expect(errorListener).toHaveBeenCalledWith(
    expect.objectContaining({
      type: 'error',
      target: socket,
    }),
  )
})

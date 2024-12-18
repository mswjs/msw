// @vitest-environment node
import { http, HttpResponse } from 'msw'
import { setupRemoteServer } from 'msw/node'
import { spawnTestApp } from './utils'

const remote = setupRemoteServer()

beforeAll(async () => {
  await remote.listen()
})

afterEach(() => {
  remote.resetHandlers()
})

afterAll(async () => {
  await remote.close()
})

it(
  'supports responding to a remote request with text',
  remote.boundary(async () => {
    remote.use(
      http.get('https://example.com/resource', () => {
        return HttpResponse.text('hello world')
      }),
    )

    await using testApp = await spawnTestApp(require.resolve('./use.app.js'))

    const response = await fetch(new URL('/resource', testApp.url))
    expect(response.status).toBe(200)
    expect(response.statusText).toBe('OK')
    await expect(response.text()).resolves.toBe('hello world')
  }),
)

it(
  'supports responding to a remote request with JSON',
  remote.boundary(async () => {
    remote.use(
      http.get('https://example.com/resource', () => {
        return HttpResponse.json({ hello: 'world' })
      }),
    )

    await using testApp = await spawnTestApp(require.resolve('./use.app.js'))

    const response = await fetch(new URL('/resource', testApp.url))
    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ hello: 'world' })
  }),
)

it(
  'supports responding to a remote request with ArrayBuffer',
  remote.boundary(async () => {
    remote.use(
      http.get('https://example.com/resource', () => {
        return HttpResponse.arrayBuffer(new TextEncoder().encode('hello world'))
      }),
    )

    await using testApp = await spawnTestApp(require.resolve('./use.app.js'))

    const response = await fetch(new URL('/resource', testApp.url))
    const buffer = await response.arrayBuffer()

    expect(response.status).toBe(200)
    expect(new TextDecoder().decode(buffer)).toBe('hello world')
  }),
)

it(
  'supports responding to a remote request with Blob',
  remote.boundary(async () => {
    remote.use(
      http.get('https://example.com/resource', () => {
        return new Response(new Blob(['hello world']))
      }),
    )

    await using testApp = await spawnTestApp(require.resolve('./use.app.js'))

    const response = await fetch(new URL('/resource', testApp.url))
    expect(response.status).toBe(200)
    await expect(response.blob()).resolves.toEqual(new Blob(['hello world']))
  }),
)

it(
  'supports responding to a remote request with FormData',
  remote.boundary(async () => {
    remote.use(
      http.get('https://example.com/resource', () => {
        const formData = new FormData()
        formData.append('hello', 'world')
        return HttpResponse.formData(formData)
      }),
    )

    await using testApp = await spawnTestApp(require.resolve('./use.app.js'))

    const response = await fetch(new URL('/resource', testApp.url))
    expect(response.status).toBe(200)

    await expect(response.text()).resolves.toMatch(
      /^------formdata-undici-\d{12}\r\nContent-Disposition: form-data; name="hello"\r\n\r\nworld\r\n------formdata-undici-\d{12}--$/,
    )
  }),
)

it(
  'supports responding to a remote request with ReadableStream',
  remote.boundary(async () => {
    const encoder = new TextEncoder()
    remote.use(
      http.get('https://example.com/resource', () => {
        const stream = new ReadableStream({
          start(controller) {
            controller.enqueue(encoder.encode('hello'))
            controller.enqueue(encoder.encode(' '))
            controller.enqueue(encoder.encode('world'))
            controller.close()
          },
        })
        return new Response(stream, {
          headers: { 'Content-Type': 'text/plain' },
        })
      }),
    )

    await using testApp = await spawnTestApp(require.resolve('./use.app.js'))

    const response = await fetch(new URL('/resource', testApp.url))
    expect(response.status).toBe(200)
    await expect(response.text()).resolves.toBe('hello world')
  }),
)

import { observeResponseBodyStream } from './observe-response-body-stream'

it('returns null for a response without a body', () => {
  expect(observeResponseBodyStream(new Response(null))).toBeNull()
})

it('returns null for a response whose body is already used', async () => {
  const response = new Response('hello')
  await response.text()

  expect(observeResponseBodyStream(response)).toBeNull()
})

it('returns null for a response whose body is locked', () => {
  const response = new Response('hello')
  response.body?.getReader()

  expect(observeResponseBodyStream(response)).toBeNull()
})

it('resolves "settled" when the response body is read to completion', async () => {
  const observed = observeResponseBodyStream(new Response('hello'))
  expect(observed).not.toBeNull()

  await expect(observed?.response.text()).resolves.toBe('hello')
  await expect(observed?.settled).resolves.toBeUndefined()
})

it('resolves "settled" when the response body errors', async () => {
  const stream = new ReadableStream({
    start(controller) {
      controller.error(new Error('stream error'))
    },
  })
  const observed = observeResponseBodyStream(new Response(stream))
  expect(observed).not.toBeNull()

  await expect(observed?.response.text()).rejects.toThrow('stream error')
  await expect(observed?.settled).resolves.toBeUndefined()
})

it('resolves "settled" when the response body is canceled', async () => {
  const stream = new ReadableStream({
    pull(controller) {
      controller.enqueue(new TextEncoder().encode('ping'))
    },
  })
  const observed = observeResponseBodyStream(new Response(stream))
  const reader = observed?.response.body?.getReader()
  expect(reader).toBeDefined()

  await reader?.read()
  await reader?.cancel(new Error('client disconnected'))

  await expect(observed?.settled).resolves.toBeUndefined()
})

it('resolves "settled" when the response body is consumed via piping', async () => {
  const observed = observeResponseBodyStream(new Response('hello'))
  expect(observed).not.toBeNull()

  await observed?.response.body?.pipeTo(new WritableStream())
  await expect(observed?.settled).resolves.toBeUndefined()
})

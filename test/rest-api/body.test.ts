import * as path from 'path'
import { runBrowserWith } from '../support/runBrowserWith'

function createRuntime() {
  return runBrowserWith(path.resolve(__dirname, 'body.mocks.ts'))
}

test('handles a GET request without a body', async () => {
  const runtime = await createRuntime()

  const res = await runtime.request({
    url: `${runtime.origin}/login`,
  })
  const body = await res.json()
  expect(body).toEqual({ body: undefined })

  return runtime.cleanup()
})

test('handles a GET request without a body and "Content-Type: application/json" header', async () => {
  const runtime = await createRuntime()

  const res = await runtime.request({
    url: `${runtime.origin}/login`,
    fetchOptions: {
      headers: {
        'Content-Type': 'application/json',
      },
    },
  })
  const body = await res.json()
  expect(body).toEqual({ body: undefined })

  return runtime.cleanup()
})

test('handles a POST request with an explicit empty body', async () => {
  const runtime = await createRuntime()

  const res = await runtime.request({
    url: `${runtime.origin}/login`,
    fetchOptions: {
      method: 'POST',
      body: '',
    },
  })
  const body = await res.json()
  expect(body).toEqual({ body: '' })

  return runtime.cleanup()
})

test('handles a POST request with a textual body', async () => {
  const runtime = await createRuntime()

  const res = await runtime.request({
    url: `${runtime.origin}/login`,
    fetchOptions: {
      method: 'POST',
      body: 'text-body',
    },
  })
  const body = await res.json()
  expect(body).toEqual({ body: 'text-body' })

  return runtime.cleanup()
})

test('handles a POST request with a JSON body and "Content-Type: application/json" header', async () => {
  const runtime = await createRuntime()

  const res = await runtime.request({
    url: `${runtime.origin}/login`,
    fetchOptions: {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        json: 'body',
      }),
    },
  })
  const body = await res.json()
  expect(body).toEqual({
    body: {
      json: 'body',
    },
  })

  return runtime.cleanup()
})

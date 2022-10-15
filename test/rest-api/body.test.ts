/**
 * @jest-environment jsdom
 */
import * as path from 'path'
import { pageWith } from 'page-with'

function createRuntime() {
  return pageWith({
    example: path.resolve(__dirname, 'body.mocks.ts'),
  })
}

test('handles a GET request without a body', async () => {
  const runtime = await createRuntime()

  const res = await runtime.request('/resource')
  const body = await res.json()

  expect(body).toEqual({ value: '' })
})

test('handles a GET request without a body', async () => {
  const runtime = await createRuntime()

  const res = await runtime.request('/resource')
  const json = await res.json()

  expect(json).toEqual({ value: '' })
})

test('handles a POST request with an explicit empty body', async () => {
  const runtime = await createRuntime()

  const res = await runtime.request('/resource', {
    method: 'POST',
    body: '',
  })
  const json = await res.json()

  expect(json).toEqual({ value: '' })
})

test('handles a POST request with a textual body', async () => {
  const runtime = await createRuntime()

  const res = await runtime.request('/resource', {
    method: 'POST',
    body: 'text-body',
  })
  const json = await res.json()

  expect(json).toEqual({ value: 'text-body' })
})

test('handles a POST request with a JSON body and "Content-Type: application/json" header', async () => {
  const runtime = await createRuntime()

  const res = await runtime.request('/resource', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      firstName: 'John',
    }),
  })
  const json = await res.json()

  expect(json).toEqual({
    value: {
      firstName: 'John',
    },
  })
})

test('handles a POST request with a multipart body and "Content-Type: multipart/form-data" header', async () => {
  const runtime = await createRuntime()

  await runtime.page.evaluate(() => {
    const data = new FormData()
    data.set('file', new File(['file content'], 'file1.txt'))
    data.set('text', 'text content')
    data.set('text2', 'another text content')
    data.append('text2', 'another text content 2')

    fetch('/upload', {
      method: 'POST',
      body: data,
    })
  })

  const res = await runtime.page.waitForResponse(/\/upload/)
  const json = await res.json()

  expect(json).toEqual({
    file: 'file content',
    text: 'text content',
    text2: ['another text content', 'another text content 2'],
  })
})

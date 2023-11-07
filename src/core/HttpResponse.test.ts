/**
 * @vitest-environment node
 */
import { TextEncoder } from 'util'
import { HttpResponse } from './HttpResponse'

it('creates a plain response', async () => {
  const response = new HttpResponse(null, { status: 301 })
  expect(response.status).toBe(301)
  expect(response.statusText).toBe('Moved Permanently')
  expect(response.body).toBe(null)
  expect(await response.text()).toBe('')
  expect(Object.fromEntries(response.headers.entries())).toEqual({})
})

it('creates a text response', async () => {
  const response = HttpResponse.text('hello world', { status: 201 })

  expect(response.status).toBe(201)
  expect(response.statusText).toBe('Created')
  expect(response.body).toBeInstanceOf(ReadableStream)
  expect(await response.text()).toBe('hello world')
  expect(Object.fromEntries(response.headers.entries())).toEqual({
    'content-type': 'text/plain',
  })
})

describe('HttpResponse.json()', () => {
  it('creates a json response given an object', async () => {
    const response = HttpResponse.json({ firstName: 'John' })

    expect(response.status).toBe(200)
    expect(response.statusText).toBe('OK')
    expect(response.body).toBeInstanceOf(ReadableStream)
    expect(await response.json()).toEqual({ firstName: 'John' })
    expect(Object.fromEntries(response.headers.entries())).toEqual({
      'content-type': 'application/json',
    })
  })

  it('creates a json response given a plain string', async () => {
    const response = HttpResponse.json(`"hello"`)

    expect(response.status).toBe(200)
    expect(response.statusText).toBe('OK')
    expect(response.body).toBeInstanceOf(ReadableStream)
    expect(await response.json()).toBe(`"hello"`)
    expect(Object.fromEntries(response.headers.entries())).toEqual({
      'content-type': 'application/json',
    })
  })

  it('creates a json response given a number', async () => {
    const response = HttpResponse.json(123)

    expect(response.status).toBe(200)
    expect(response.statusText).toBe('OK')
    expect(response.body).toBeInstanceOf(ReadableStream)
    expect(await response.json()).toBe(123)
    expect(Object.fromEntries(response.headers.entries())).toEqual({
      'content-type': 'application/json',
    })
  })

  it('creates a json response given a json ReadableStream', async () => {
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode(`{"firstName`))
        controller.enqueue(encoder.encode(`":"John`))
        controller.enqueue(encoder.encode(`"}`))
        controller.close()
      },
    })
    const response = HttpResponse.json(stream)

    expect(response.status).toBe(200)
    expect(response.statusText).toBe('OK')
    expect(response.body).toBeInstanceOf(ReadableStream)
    expect(await response.json()).toEqual({ firstName: 'John' })
    expect(Object.fromEntries(response.headers.entries())).toEqual({
      'content-type': 'application/json',
    })
  })
})

it('creates an xml response', async () => {
  const response = HttpResponse.xml('<user name="John" />')

  expect(response.status).toBe(200)
  expect(response.statusText).toBe('OK')
  expect(response.body).toBeInstanceOf(ReadableStream)
  expect(await response.text()).toBe('<user name="John" />')
  expect(Object.fromEntries(response.headers.entries())).toEqual({
    'content-type': 'text/xml',
  })
})

it('creates an array buffer response', async () => {
  const buffer = new TextEncoder().encode('hello world')
  const response = HttpResponse.arrayBuffer(buffer)

  expect(response.status).toBe(200)
  expect(response.statusText).toBe('OK')
  expect(response.body).toBeInstanceOf(ReadableStream)

  const responseData = await response.arrayBuffer()
  expect(responseData).toEqual(buffer.buffer)
  expect(Object.fromEntries(response.headers.entries())).toEqual({
    'content-length': '11',
  })
})

it('creates a form data response', async () => {
  const formData = new FormData()
  formData.append('firstName', 'John')
  const response = HttpResponse.formData(formData)

  expect(response.status).toBe(200)
  expect(response.statusText).toBe('OK')
  expect(response.body).toBeInstanceOf(ReadableStream)

  const responseData = await response.formData()
  expect(responseData.get('firstName')).toBe('John')
  expect(Object.fromEntries(response.headers.entries())).toEqual({
    'content-type': expect.stringContaining(
      'multipart/form-data; boundary=----',
    ),
  })
})

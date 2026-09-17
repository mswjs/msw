import { http, HttpResponse } from 'msw'
import { defineNetwork, expect } from '../../setup/vitest-helpers'

const forwardRequestBody: Parameters<typeof http.get>[1] = async ({
  request,
}) => {
  const requestText =
    request.headers.get('Content-Type') === 'application/json' && request.body
      ? await request.json()
      : await request.text()

  return HttpResponse.json({ value: requestText })
}

const forwardMultipartRequestBody: Parameters<typeof http.post>[1] = async ({
  request,
}) => {
  const formData = await request.formData()
  const responseBody: Record<string, string | Array<string>> = {}

  for (const [name, value] of formData.entries()) {
    const nextValue = value instanceof File ? await value.text() : value

    if (responseBody[name]) {
      responseBody[name] = Array.prototype.concat(
        [],
        responseBody[name],
        nextValue,
      )
    } else {
      responseBody[name] = nextValue
    }
  }

  return HttpResponse.json(responseBody)
}

const handlers = [
  http.get('*/resource', forwardRequestBody),
  http.post('*/resource', forwardRequestBody),
  http.post('*/upload', forwardMultipartRequestBody),
]

const test = defineNetwork({ handlers })

test('handles a GET request without a body', async ({ fetch }) => {
  const res = await fetch('/resource')
  const body = await res.json()

  expect(body).toEqual({ value: '' })
})

test('handles a POST request with an explicit empty body', async ({
  fetch,
}) => {
  const res = await fetch('/resource', {
    method: 'POST',
    body: '',
  })
  const json = await res.json()

  expect(json).toEqual({ value: '' })
})

test('handles a POST request with a textual body', async ({ fetch }) => {
  const res = await fetch('/resource', {
    method: 'POST',
    body: 'text-body',
  })
  const json = await res.json()

  expect(json).toEqual({ value: 'text-body' })
})

test('handles a POST request with a JSON body and "Content-Type: application/json" header', async ({
  fetch,
}) => {
  const res = await fetch('/resource', {
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

test('handles a POST request with a multipart body and "Content-Type: multipart/form-data" header', async ({
  page,
}) => {
  await page.evaluate(async () => {
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

  const response = await page.waitForResponse(/\/upload/)

  await expect(response.json()).resolves.toEqual({
    file: 'file content',
    text: 'text content',
    text2: ['another text content', 'another text content 2'],
  })
})

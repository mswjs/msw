import { test, expect } from '../playwright.extend'

const EXAMPLE_PATH = new URL('./body.mocks.ts', import.meta.url)

test('handles a GET request without a body', async ({ loadExample, fetch }) => {
  await loadExample(EXAMPLE_PATH)

  const res = await fetch('/resource')
  const body = await res.json()

  expect(body).toEqual({ value: '' })
})

test('handles a POST request with an explicit empty body', async ({
  loadExample,
  fetch,
}) => {
  await loadExample(EXAMPLE_PATH)

  const res = await fetch('/resource', {
    method: 'POST',
    body: '',
  })
  const json = await res.json()

  expect(json).toEqual({ value: '' })
})

test('handles a POST request with a textual body', async ({
  loadExample,
  fetch,
}) => {
  await loadExample(EXAMPLE_PATH)

  const res = await fetch('/resource', {
    method: 'POST',
    body: 'text-body',
  })
  const json = await res.json()

  expect(json).toEqual({ value: 'text-body' })
})

test('handles a POST request with a JSON body and "Content-Type: application/json" header', async ({
  loadExample,
  fetch,
}) => {
  await loadExample(EXAMPLE_PATH)

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
  loadExample,
  page,
}) => {
  await loadExample(EXAMPLE_PATH)

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

import { test, expect } from '../playwright.extend'

const EXAMPLE_PATH = new URL('./body.mocks.ts', import.meta.url)

test('handles a GET request without a body', async ({ loadExample, fetch }) => {
  await loadExample(EXAMPLE_PATH)

  const response = await fetch('/resource')
  await expect(response.json()).resolves.toEqual({ value: '' })
})

test('handles a POST request with an explicit empty body', async ({
  loadExample,
  fetch,
}) => {
  await loadExample(EXAMPLE_PATH)

  const response = await fetch('/resource', {
    method: 'POST',
    body: '',
  })
  await expect(response.json()).resolves.toEqual({ value: '' })
})

test('handles a POST request with a textual body', async ({
  loadExample,
  fetch,
}) => {
  await loadExample(EXAMPLE_PATH)

  const response = await fetch('/resource', {
    method: 'POST',
    body: 'text-body',
  })
  await expect(response.json()).resolves.toEqual({ value: 'text-body' })
})

test('handles a POST request with a JSON body and "Content-Type: application/json" header', async ({
  loadExample,
  fetch,
}) => {
  await loadExample(EXAMPLE_PATH)

  const response = await fetch('/resource', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      firstName: 'John',
    }),
  })

  await expect(response.json()).resolves.toEqual({
    value: {
      firstName: 'John',
    },
  })
})

test('handles a POST request with a multipart body and "Content-Type: multipart/form-data" header', async ({
  loadExample,
  fetch,
  page,
}) => {
  await loadExample(EXAMPLE_PATH)

  await page.evaluate(() => {
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

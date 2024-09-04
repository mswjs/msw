import { test, expect } from '../playwright.extend'

test('mocks a response to an XMLHttpRequest', async ({ loadExample, page }) => {
  await loadExample(require.resolve('./xhr.mocks.ts'))

  const REQUEST_URL = 'https://api.github.com/users/octocat'

  page.evaluate((url) => {
    const req = new XMLHttpRequest()
    req.open('GET', url)
    req.send()
  }, REQUEST_URL)

  const res = await page.waitForResponse(REQUEST_URL)
  const body = await res.json()

  expect(res.status()).toBe(200)
  expect(body).toEqual({
    mocked: true,
  })
})

test('mocks upload events on XMLHttpRequest', async ({
  loadExample,
  spyOnConsole,
  page,
}) => {
  const consoleSpy = spyOnConsole()

  await loadExample(require.resolve('./xhr.mocks.ts'))

  const REQUEST_URL = 'https://api.github.com/users/octocat'

  page.evaluate((url) => {
    const req = new XMLHttpRequest()
    const blob = new File(['hello world'], 'hello.txt', { type: 'text/plain' })

    req.open('POST', url)

    req.upload.addEventListener('progress', (event) =>
      console.log('On upload progress'),
    )

    req.upload.addEventListener('loadend', (event) =>
      console.log('On upload load end'),
    )

    req.send(blob)
  }, REQUEST_URL)

  const res = await page.waitForResponse(REQUEST_URL)
  const body = await res.json()

  expect(consoleSpy.get('log')).toContain('On upload progress')
  expect(consoleSpy.get('log')).toContain('On upload load end')
})

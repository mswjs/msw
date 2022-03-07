import * as path from 'path'
import { PageWithOptions, pageWith } from 'page-with'

const routes: PageWithOptions['routes'] = (app) => {
  // Serve the delayed Service Worker to emulate its long installation.
  // Requests made during the worker installation must be deferred.
  app.get('/worker.js', (req, res) => {
    res.sendFile(path.resolve(__dirname, 'worker.delayed.js'))
  })

  app.get('/numbers', (req, res) => {
    res.json([10, 11, 12])
  })

  app.get('/letters', (req, res) => {
    res.json(['x', 'y', 'z'])
  })
}

test('defers network requests until the worker is ready', async () => {
  const runtime = await pageWith({
    example: path.resolve(__dirname, 'wait-until-ready.mocks.ts'),
    routes,
  })

  const [numbersResponse, lettersResponse] = await Promise.all([
    runtime.page.waitForResponse((res) => {
      return res.url().includes('/numbers')
    }),
    runtime.page.waitForResponse((res) => {
      return res.url().includes('/letters')
    }),
  ])

  expect(numbersResponse.status()).toBe(200)
  expect(await numbersResponse.json()).toEqual([1, 2, 3])

  expect(lettersResponse.status()).toBe(200)
  expect(await lettersResponse.json()).toEqual(['a', 'b', 'c'])
})

test('allows requests to passthrough when the "waitUntilReady" option is disabled', async () => {
  const runtime = await pageWith({
    example: path.resolve(__dirname, 'wait-until-ready.false.mocks.ts'),
    routes,
  })
  await runtime.page.reload()

  const [numbersResponse, lettersResponse] = await Promise.all([
    runtime.page.waitForResponse((res) => {
      return res.url().includes('/numbers')
    }),
    runtime.page.waitForResponse((res) => {
      return res.url().includes('/letters')
    }),
  ])

  expect(numbersResponse.status()).toBe(200)
  expect(await numbersResponse.json()).toEqual([10, 11, 12])

  expect(lettersResponse.status()).toBe(200)
  expect(await lettersResponse.json()).toEqual(['x', 'y', 'z'])
})

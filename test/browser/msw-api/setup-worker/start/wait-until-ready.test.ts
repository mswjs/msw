import * as path from 'path'
import * as express from 'express'
import { test, expect } from '../../../playwright.extend'

declare global {
  interface Window {
    init(): void
  }
}

const compilationRouter = (router: express.Router) => {
  router.get('/worker.js', (_, res) => {
    res.sendFile(path.resolve(__dirname, 'worker.delayed.js'))
  })

  router.get('/numbers', (_, res) => {
    res.json([10, 11, 12])
  })

  router.get('/letters', (_, res) => {
    res.json(['x', 'y', 'z'])
  })
}

test('defers network requests until the worker is ready', async ({
  loadExample,
  page,
}) => {
  await loadExample(require.resolve('./wait-until-ready.mocks.ts'), {
    skipActivation: true,
    beforeNavigation(compilation) {
      compilation.use(compilationRouter)
    },
  })

  await page.waitForFunction(() => {
    return typeof window.init === 'function'
  })
  page.evaluate(() => window.init())

  const [numbersResponse, lettersResponse] = await Promise.all([
    page.waitForResponse((res) => {
      return res.url().includes('/numbers')
    }),
    page.waitForResponse((res) => {
      return res.url().includes('/letters')
    }),
  ])

  expect(numbersResponse.status()).toBe(200)
  expect(await numbersResponse.json()).toEqual([1, 2, 3])

  expect(lettersResponse.status()).toBe(200)
  expect(await lettersResponse.json()).toEqual(['a', 'b', 'c'])
})

test('allows requests to passthrough when the "waitUntilReady" option is disabled', async ({
  loadExample,
  page,
}) => {
  await loadExample(require.resolve('./wait-until-ready.false.mocks.ts'), {
    skipActivation: true,
    beforeNavigation(compilation) {
      compilation.use(compilationRouter)
    },
  })

  await page.waitForFunction(() => {
    return typeof window.init === 'function'
  })
  page.evaluate(() => window.init())

  const [numbersResponse, lettersResponse] = await Promise.all([
    page.waitForResponse((res) => {
      return res.url().includes('/numbers')
    }),
    page.waitForResponse((res) => {
      return res.url().includes('/letters')
    }),
  ])

  expect(numbersResponse.status()).toBe(200)
  expect(await numbersResponse.json()).toEqual([10, 11, 12])

  expect(lettersResponse.status()).toBe(200)
  expect(await lettersResponse.json()).toEqual(['x', 'y', 'z'])
})

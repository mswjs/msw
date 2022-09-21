import { test, expect } from '../../../playwright.extend'

test('restores deferred requests if the worker registration fails', async ({
  loadExample,
  page,
}) => {
  await loadExample(require.resolve('./wait-until-ready.error.mocks.ts'), {
    beforeNavigation(compilation) {
      compilation.use((router) => {
        router.get('/numbers', (req, res) => {
          res.status(200).json([4, 5, 6])
        })

        router.get('/letters', (req, res) => {
          res.status(200).json(['d', 'e', 'f'])
        })
      })
    },
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

  // Assert that although the worker registration failed,
  // initial requests were performed, receiving the actual response.
  const numbersStatus = numbersResponse.status()
  const numbersBody = await numbersResponse.json()
  expect(numbersStatus).toBe(200)
  expect(numbersBody).toEqual([4, 5, 6])

  const lettersStatus = lettersResponse.status()
  const lettersBody = await lettersResponse.json()
  expect(lettersStatus).toBe(200)
  expect(lettersBody).toEqual(['d', 'e', 'f'])
})

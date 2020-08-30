import * as path from 'path'
import { runBrowserWith } from '../../../support/runBrowserWith'

test('restores deferred requests if the worker registration fails', async () => {
  const runtime = await runBrowserWith(
    path.resolve(__dirname, 'wait-until-ready.error.mocks.ts'),
    {
      withRoutes(app) {
        app.get('/numbers', (req, res) => {
          res.status(200).json([4, 5, 6])
        })

        app.get('/letters', (req, res) => {
          res.status(200).json(['d', 'e', 'f'])
        })
      },
    },
  )

  await runtime.page.reload()

  const [numbersResponse, lettersResponse] = await Promise.all([
    runtime.page.waitForResponse((res) => {
      return res.url().includes('/numbers')
    }),
    runtime.page.waitForResponse((res) => {
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

  await runtime.cleanup()
})

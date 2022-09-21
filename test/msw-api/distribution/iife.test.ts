import * as fs from 'fs'
import * as path from 'path'
import { test, expect } from '../../playwright.extend'

test('supports the usage of the iife bundle in a <script> tag', async ({
  loadExample,
  spyOnConsole,
  fetch,
}) => {
  const consoleSpy = spyOnConsole()
  await loadExample(require.resolve('./iife.mocks.js'), {
    markup: `<script src="./iife/index.js"></script>`,
    beforeNavigation(compilation) {
      compilation.use((router) => {
        router.get('/iife/index.js', (_, res) => {
          fs.createReadStream(
            path.resolve(__dirname, '../../..', 'lib/iife/index.js'),
          ).pipe(res)

          return res
        })
      })
    },
  })

  expect(consoleSpy.get('error')).toBeUndefined()

  const response = await fetch('/user')

  expect(response.status()).toBe(200)
  expect(await response.allHeaders()).toHaveProperty('x-powered-by', 'msw')
  expect(await response.json()).toEqual({
    firstName: 'John',
  })
})

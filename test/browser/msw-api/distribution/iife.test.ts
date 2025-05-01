import * as fs from 'fs'
import { test, expect } from '../../playwright.extend'

test('supports the usage of the iife bundle in a <script> tag', async ({
  loadExample,
  spyOnConsole,
  fetch,
}) => {
  const consoleSpy = spyOnConsole()
  await loadExample(new URL('./iife.mocks.js', import.meta.url), {
    markup: `<script src="./iife/index.js"></script>`,
    beforeNavigation(compilation) {
      compilation.use((router) => {
        router.get('/iife/index.js', (_, res) => {
          fs.createReadStream(
            new URL('../../../../lib/iife/index.js', import.meta.url),
          ).pipe(res)

          return res
        })
      })
    },
  })

  expect(consoleSpy.get('error')).toBeUndefined()

  const response = await fetch('/user')

  expect(response.status()).toBe(200)
  expect(await response.json()).toEqual({
    firstName: 'John',
  })
})

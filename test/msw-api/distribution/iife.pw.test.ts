import fs from 'node:fs'
import { inlineSource, test, expect } from '../../setup/playwright'

const iifeSource = inlineSource(`
const { setupWorker, http, HttpResponse } = MockServiceWorker

const worker = setupWorker(
  http.get('/user', () => {
    return HttpResponse.json({ firstName: 'John' })
  }),
)

worker.start()
`)

test('supports the usage of the iife bundle in a <script> tag', async ({
  loadExample,
  spyOnConsole,
  fetch,
}) => {
  const consoleSpy = spyOnConsole()
  await loadExample(iifeSource, {
    markup: `<script src="./iife/index.js"></script>`,
    beforeNavigation(compilation) {
      compilation.use((router) => {
        router.get('/iife/index.js', (_, response) => {
          fs.createReadStream(
            new URL('../../../lib/iife/index.js', import.meta.url),
          ).pipe(response)

          return response
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

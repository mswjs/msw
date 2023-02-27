import { sleep } from '../../../support/utils'
import { test, expect } from '../../playwright.extend'

test('gracefully handles a 204 response null body during life-cycle events', async ({
  loadExample,
  fetch,
  page,
}) => {
  await loadExample(require.resolve('./null-body.mocks.ts'))

  let error: Error
  page.on('pageerror', (pageError) => {
    error = pageError
  })

  await fetch('https://test.mswjs.io/api/books')
  await sleep(500)

  expect(error).not.toBeDefined()
})

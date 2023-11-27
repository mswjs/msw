import { sleep } from '../../../support/utils'
import { test, expect } from '../../playwright.extend'

test('gracefully handles a 204 response null body during life-cycle events', async ({
  loadExample,
  fetch,
  page,
}) => {
  await loadExample(require.resolve('./null-body.mocks.ts'))

  const errors: Array<Error> = []
  page.on('pageerror', (pageError) => {
    errors.push(pageError)
  })

  await fetch('/api/books')
  await sleep(500)

  expect(errors).toEqual([])
})

test('gracefully handles a 304 response null body during life-cycle events', async ({
  loadExample,
  fetch,
  page,
}) => {
  await loadExample(require.resolve('./null-body.mocks.ts'))

  const errors: Array<Error> = []
  page.on('pageerror', (pageError) => {
    errors.push(pageError)
  })

  await fetch('/api/authors')
  await sleep(500)

  expect(errors).toEqual([])
})

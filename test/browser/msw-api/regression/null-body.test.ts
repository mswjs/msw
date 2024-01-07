import { expect, test } from '../../playwright.extend'

for (const code of [204, 205, 304]) {
  test(`gracefully handles a ${code} response null body during life-cycle events`, async ({
    loadExample,
    fetch,
    page,
  }) => {
    await loadExample(require.resolve('./null-body.mocks.ts'))

    const errors: Array<Error> = []
    page.on('pageerror', (pageError) => {
      errors.push(pageError)
    })

    await fetch(`/api/${code}`)
    expect(errors).toEqual([])
  })
}

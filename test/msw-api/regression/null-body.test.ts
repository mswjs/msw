import { http, HttpResponse } from 'msw'
import { defineNetwork, expect } from '../../setup/vitest-helpers'

const handlers = [
  http.get<{ code: string }>('*/api/:code', ({ params }) => {
    return new HttpResponse(null, { status: parseInt(params.code) })
  }),
]

const test = defineNetwork({ handlers })

for (const code of [204, 205, 304]) {
  test(`gracefully handles a ${code} response null body during life-cycle events`, async ({
    fetch,
    page,
  }) => {
    const errors: Array<Error> = []
    page.on('pageerror', (pageError) => {
      errors.push(pageError)
    })

    await fetch(`/api/${code}`)
    expect(errors).toEqual([])
  })
}

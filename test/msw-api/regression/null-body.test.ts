import * as path from 'path'
import { pageWith } from 'page-with'
import { sleep } from '../../support/utils'

test('gracefully handles a 204 response null body during life-cycle events', async () => {
  let error: Error
  const runtime = await pageWith({
    example: path.resolve(__dirname, 'null-body.mocks.ts'),
  })

  runtime.page.on('pageerror', (pageError) => {
    error = pageError
  })

  await runtime.request('https://test.mswjs.io/api/books')
  await sleep(500)

  expect(error).not.toBeDefined()
})

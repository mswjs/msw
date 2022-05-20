import * as path from 'path'
import { pageWith } from 'page-with'

function createRuntime() {
  return pageWith({
    example: path.resolve(__dirname, 'hard-reload.mocks.ts'),
  })
}

test('keeps the mocking enabled after hard-reload of the page', async () => {
  const runtime = await createRuntime()

  runtime.page.evaluate(() => {
    /**
     * Emulate a forced reload.
     * Since `location.reload(true)` is deprecated,
     * use a workaround.
     * @see https://stackoverflow.com/a/65544086/2754939
     */
    location.replace(location.href)
  })

  await runtime.page.waitForNavigation({
    waitUntil: 'networkidle',
  })

  const res = await runtime.request('https://api.github.com')
  const headers = await res.allHeaders()
  const body = await res.json()

  expect(headers).toHaveProperty('x-powered-by', 'msw')
  expect(body).toEqual({
    mocked: true,
  })
})

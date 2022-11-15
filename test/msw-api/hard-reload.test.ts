import * as path from 'path'
import { pageWith } from 'page-with'
import { sleep } from '../support/utils'

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
     * Since `location.reload(true)` is deprecated, using a workaround.
     * @see https://stackoverflow.com/a/65544086/2754939
     */
    location.replace(location.href)
  })

  await runtime.page.waitForNavigation({
    waitUntil: 'networkidle',
  })

  /**
   * @note No idea why immediate reload and awaiting for network idle
   * stopped working. Sadness.
   * @fixme Rewrite this to await a reliable source.
   */
  await sleep(200)

  const res = await runtime.request('/resource')
  const headers = await res.allHeaders()
  const body = await res.json()

  expect(headers).toHaveProperty('x-powered-by', 'msw')
  expect(body).toEqual({
    mocked: true,
  })
})

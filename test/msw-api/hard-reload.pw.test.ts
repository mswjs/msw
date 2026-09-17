import { inlineSource, test, expect } from '../setup/playwright'

const hardReloadSource = inlineSource(`
import { http, HttpResponse } from 'msw'
import { setupWorker } from 'msw/browser'

const worker = setupWorker(
  http.get('https://example.com/resource', () => {
    return HttpResponse.json({ mocked: true })
  }),
)

worker.start()
`)

test('keeps the mocking enabled after hard-reload of the page', async ({
  loadExample,
  page,
  fetch,
  waitForMswActivation,
}) => {
  await loadExample(hardReloadSource)

  page.evaluate(() => {
    /**
     * Emulate a forced reload.
     * Since `location.reload(true)` is deprecated, use a workaround.
     * @see https://stackoverflow.com/a/65544086/2754939
     */
    location.replace(location.href)
  })

  await waitForMswActivation()

  const res = await fetch('https://example.com/resource')
  const body = await res.json()

  // Still intercepts and mocks responses after a hard-reload.
  expect(res.fromServiceWorker()).toBe(true)
  expect(body).toEqual({ mocked: true })
})

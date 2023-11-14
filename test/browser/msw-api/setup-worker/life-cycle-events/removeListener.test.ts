import { SetupWorkerApi } from 'msw/browser'
import { test, expect } from '../../../playwright.extend'

declare namespace window {
  export const msw: {
    worker: SetupWorkerApi
    requestEndListner: any
  }
}

test('removes a listener by the event name', async ({
  loadExample,
  spyOnConsole,
  fetch,
  page,
  waitFor,
  makeUrl,
}) => {
  const consoleSpy = spyOnConsole()
  await loadExample(require.resolve('./on.mocks.ts'))

  await page.evaluate(() => {
    const { msw } = window
    msw.worker.events.removeListener('request:end', msw.requestEndListner)
  })

  const url = makeUrl('/user')
  await fetch(url)

  await waitFor(() => {
    expect(consoleSpy.get('warning')).toContainEqual(
      expect.stringContaining('[response:mocked]'),
    )
  })

  expect(consoleSpy.get('warning')).not.toContainEqual(
    expect.stringContaining('[request:end]'),
  )
})

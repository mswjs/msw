import * as path from 'path'
import { pageWith } from 'page-with'
import { SetupWorkerApi } from 'msw'
import { waitFor } from '../../../support/waitFor'

declare namespace window {
  export const msw: {
    worker: SetupWorkerApi
    requestEndListner: any
  }
}

test('removes a listener by the event name', async () => {
  const runtime = await pageWith({
    example: path.resolve(__dirname, 'on.mocks.ts'),
  })

  await runtime.page.evaluate(() => {
    const { msw } = window
    msw.worker.events.removeListener('request:end', msw.requestEndListner)
  })

  const url = runtime.makeUrl('/user')
  await runtime.request(url)

  await waitFor(() => {
    expect(runtime.consoleSpy.get('warning')).toContainEqual(
      expect.stringContaining('[response:mocked]'),
    )
  })

  expect(runtime.consoleSpy.get('warning')).not.toContainEqual(
    expect.stringContaining('[request:end]'),
  )
})

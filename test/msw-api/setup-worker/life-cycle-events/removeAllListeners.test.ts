import * as path from 'path'
import { pageWith } from 'page-with'
import { SetupWorkerApi } from 'msw'
import { waitFor } from '../../../support/waitFor'

declare namespace window {
  export const msw: {
    worker: SetupWorkerApi
  }
}

function createRuntime() {
  return pageWith({
    example: path.resolve(__dirname, 'on.mocks.ts'),
  })
}

test('removes all listeners attached to the worker instance', async () => {
  const runtime = await createRuntime()
  const url = runtime.makeUrl('/user')
  await runtime.request(url)

  await waitFor(() => {
    expect(runtime.consoleSpy.get('warning')).toContainEqual(
      expect.stringContaining('[response:mocked]'),
    )
  })

  // Remove all life-cycle events listeners.
  await runtime.page.evaluate(() => {
    const { msw } = window
    msw.worker.events.removeAllListeners()
  })

  // Request the same endpoint again.
  runtime.consoleSpy.clear()
  await runtime.request(url)

  const promise = waitFor(() => {
    expect(runtime.consoleSpy.get('warning')).toContainEqual(
      expect.stringContaining('[response:mocked]'),
    )
  })

  await expect(promise).rejects.toThrow()
})

test('removes all the listeners by the event name', async () => {
  const runtime = await createRuntime()
  const url = runtime.makeUrl('/user')
  await runtime.request(url)

  await waitFor(() => {
    expect(runtime.consoleSpy.get('warning')).toContainEqual(
      expect.stringContaining('[response:mocked]'),
    )
  })

  // Request the same endpoint again.
  await runtime.page.evaluate(() => {
    const { msw } = window
    msw.worker.events.removeAllListeners('request:end')
  })

  // Request the same endpoint again.
  runtime.consoleSpy.clear()
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

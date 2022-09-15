import { SetupWorkerApi } from 'msw'
import { test, expect } from '../../../playwright.extend'

declare namespace window {
  export const msw: {
    worker: SetupWorkerApi
  }
}

const ON_EXAMPLE = require.resolve('./on.mocks.ts')

test('removes all listeners attached to the worker instance', async ({
  loadExample,
  spyOnConsole,
  fetch,
  page,
  waitFor,
}) => {
  const consoleSpy = spyOnConsole()
  await loadExample(ON_EXAMPLE)

  const url = 'http://localhost/user'
  await fetch(url)

  await waitFor(() => {
    expect(consoleSpy.get('warning')).toContainEqual(
      expect.stringContaining('[response:mocked]'),
    )
  })

  // Remove all life-cycle events listeners.
  await page.evaluate(() => {
    const { msw } = window
    msw.worker.events.removeAllListeners()
  })

  // Request the same endpoint again.
  consoleSpy.clear()
  await fetch(url)

  const promise = waitFor(() => {
    expect(consoleSpy.get('warning')).toContainEqual(
      expect.stringContaining('[response:mocked]'),
    )
  })

  await expect(promise).resolves.toBeUndefined()
})

test('removes all the listeners by the event name', async ({
  loadExample,
  spyOnConsole,
  fetch,
  page,
  waitFor,
}) => {
  const consoleSpy = spyOnConsole()
  await loadExample(ON_EXAMPLE)

  const url = 'http://localhost/user'
  await fetch(url)

  await waitFor(() => {
    expect(consoleSpy.get('warning')).toContainEqual(
      expect.stringContaining('[response:mocked]'),
    )
  })

  // Request the same endpoint again.
  await page.evaluate(() => {
    const { msw } = window
    msw.worker.events.removeAllListeners('request:end')
  })

  // Request the same endpoint again.
  consoleSpy.clear()
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

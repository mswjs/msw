/**
 * @jest-environment node
 */
import { setupWorker } from './setupWorker'

test('returns an error when run in a NodeJS environment', () => {
  expect(setupWorker).toThrow(
    '[MSW] Failed to execute `setupWorker` in a non-browser environment',
  )
})

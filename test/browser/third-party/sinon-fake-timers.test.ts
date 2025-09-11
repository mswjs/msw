import FakeTimers from '@sinonjs/fake-timers'
import { test, expect } from '../playwright.extend'

let fakeTimers: FakeTimers.InstalledClock

test.beforeAll(() => {
  fakeTimers = FakeTimers.install({
    now: Date.parse('2017-11-20T12:00:00'),
    toFake: ['Date'],
    shouldAdvanceTime: true,
  })
})

test.afterAll(() => {
  fakeTimers.uninstall()
})

test('mocks responses when using fake timers in tests', async ({
  loadExample,
  fetch,
}) => {
  await loadExample(new URL('./sinon-fake-timers.mock.js', import.meta.url))

  const response = await fetch('/resource')

  await expect(response.text()).resolves.toBe('hello world')
})

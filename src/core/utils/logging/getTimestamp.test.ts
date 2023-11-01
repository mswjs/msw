import { getTimestamp } from './getTimestamp'

beforeAll(() => {
  // Stub native `Date` prototype methods used in the tested module,
  // to always produce a predictable value for testing purposes.
  vi.spyOn(global.Date.prototype, 'getHours').mockImplementation(() => 12)
  vi.spyOn(global.Date.prototype, 'getMinutes').mockImplementation(() => 4)
  vi.spyOn(global.Date.prototype, 'getSeconds').mockImplementation(() => 8)
})

afterAll(() => {
  vi.restoreAllMocks()
})

test('returns a timestamp string of the invocation time', () => {
  const timestamp = getTimestamp()
  expect(timestamp).toBe('12:04:08')
})

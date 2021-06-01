import { isGenerator } from './isGenerator'

test('returns true given a generator function', () => {
  expect(
    isGenerator(function* () {
      yield 2
    }),
  ).toEqual(true)
})

test('returns false given a regular function', () => {
  expect(
    isGenerator(function () {
      return null
    }),
  ).toEqual(false)

  expect(isGenerator(() => null)).toEqual(false)
})

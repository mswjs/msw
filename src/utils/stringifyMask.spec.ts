import stringifyMask, { regExpPrefix } from './stringifyMask'

test('Stringifies given RegExp (with prefix)', () => {
  expect(stringifyMask(/mask(here)/)).toEqual(`${regExpPrefix}/mask(here)/`)
})

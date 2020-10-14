import { mergeMasks } from './mergeMasks'

test('merges two paths into one', () => {
  expect(mergeMasks('https://mswjs.io/', '/api/v3')).toBe(
    'https://mswjs.io/api/v3',
  )
})

test('merges two RegExp into one', () => {
  expect(mergeMasks('https://mswjs.io/', /\/bar/)).toEqual(
    /https:\/\/mswjs\.io\/bar(\/|$)/g,
  )
})

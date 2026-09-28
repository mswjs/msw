import { getPublicData } from './get-public-data'

test('returns a short string as-is', async () => {
  expect(await getPublicData('')).toBe('')
  expect(await getPublicData('hello')).toBe('hello')
})

test('returns a truncated long string', async () => {
  expect(await getPublicData('this is a very long string')).toBe(
    'this is a very long stri…',
  )
})

test('returns a short Blob text as-is', async () => {
  expect(await getPublicData(new Blob(['']))).toBe('Blob()')
  expect(await getPublicData(new Blob(['hello']))).toBe('Blob(hello)')
})

test('returns a truncated long Blob text', async () => {
  expect(await getPublicData(new Blob(['this is a very long string']))).toBe(
    'Blob(this is a very long stri…)',
  )
})

test('returns a short ArrayBuffer text as-is', async () => {
  expect(await getPublicData(new TextEncoder().encode(''))).toBe(
    'ArrayBuffer()',
  )
  expect(await getPublicData(new TextEncoder().encode('hello'))).toBe(
    'ArrayBuffer(hello)',
  )
})

test('returns a truncated ArrayBuffer text', async () => {
  expect(
    await getPublicData(new TextEncoder().encode('this is a very long string')),
  ).toBe('ArrayBuffer(this is a very long stri…)')
})

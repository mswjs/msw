/**
 * @jest-environment node
 */

test('Node does not support ReadableStream yet', () => {
  expect(typeof ReadableStream).toBe('undefined')
})

/**
 * @jest-environment node
 */
import { delay, NODE_SERVER_RESPONSE_TIME } from './delay'
import { response } from '../response'

test('sets a Node.js-specific response delay when not provided', async () => {
  const resolvedResponse = await response(delay())
  expect(resolvedResponse).toHaveProperty('delay', NODE_SERVER_RESPONSE_TIME)
})

test('allows response delay duration overrides', async () => {
  const resolvedResponse = await response(delay(1234))
  expect(resolvedResponse).toHaveProperty('delay', 1234)
})

test('throws an exception given a too large duration', async () => {
  const createErrorMessage = (value: any) => {
    return `Failed to delay a response: provided delay duration (${value}) exceeds the maximum allowed duration for "setTimeout" (2147483647). This will cause the response to be returned immediately. Please use a number within the allowed range to delay the response by exact duration, or consider the "infinite" delay mode to delay the response indefinitely.`
  }

  const exceedingValues = [
    Infinity,
    Number.MAX_VALUE,
    Number.MAX_SAFE_INTEGER,
    2147483648,
  ]

  for (const value of exceedingValues) {
    await expect(() => response(delay(value))).rejects.toThrow(
      createErrorMessage(value),
    )
  }
})

test('throws an exception given an unknown delay mode', async () => {
  await expect(() => response(delay('foo' as any))).rejects.toThrow(
    'Failed to delay a response: unknown delay mode "foo". Please make sure you provide one of the supported modes ("real", "infinite") or a number to "ctx.delay".',
  )
})

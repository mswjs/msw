/**
 * @jest-environment jsdom
 *
 * Since jsdom also runs in NodeJS, expect a NodeJS-specific implicit delay.
 */
import { delay, NODE_SERVER_RESPONSE_TIME } from './delay'
import { response } from '../response'

test('sets a NodeJS-specific response delay when not provided', () => {
  const resolvedResponse = response(delay())
  expect(resolvedResponse).toHaveProperty('delay', NODE_SERVER_RESPONSE_TIME)
})

test('allows response delay duration overrides', () => {
  const resolvedResponse = response(delay(1234))
  expect(resolvedResponse).toHaveProperty('delay', 1234)
})

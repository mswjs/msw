/**
 * @jest-environment node
 */
import { delay, NODE_SERVER_RESPONSE_TIME } from './delay'
import { response } from '../response'

test('sets a NodeJS-specific response delay when not provided', async () => {
  const resolvedResponse = await response(delay())
  expect(resolvedResponse).toHaveProperty('delay', NODE_SERVER_RESPONSE_TIME)
})

test('allows response delay duration overrides', async () => {
  const resolvedResponse = await response(delay(1234))
  expect(resolvedResponse).toHaveProperty('delay', 1234)
})

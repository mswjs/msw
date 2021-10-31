/**
 * @jest-environment jsdom
 */
import { forward } from './forward'
import { response } from '../response'

test('marks a request for forwarding', async () => {
  const resolvedResponse = await response(forward())
  expect(resolvedResponse).toHaveProperty('forward', true)
})

/**
 * @see https://github.com/mswjs/msw/issues/2714
 */
import { http, HttpResponse } from 'msw'
import { defineNetwork, expect } from '../../../setup/vitest-helpers'

let callCount = 0
const handlers = [
  http.get('/resource', () => {
    callCount += 1
    return HttpResponse.json({ callCount })
  }),
]
const test = defineNetwork({ handlers })

test('does not accumulate request handlers across restarts', async ({
  network,
  fetch,
}) => {
  if (!('start' in network)) {
    throw new Error('Expected a browser worker instance')
  }

  const firstResponse = await fetch('/resource')
  await expect(firstResponse.json()).resolves.toEqual({ callCount: 1 })

  await network.stop()
  await network.start({ quiet: true })

  const secondResponse = await fetch('/resource')
  await expect(secondResponse.json()).resolves.toEqual({ callCount: 2 })

  await network.stop()
  await network.start({ quiet: true })

  const thirdResponse = await fetch('/resource')
  await expect(thirdResponse.json()).resolves.toEqual({ callCount: 3 })
})

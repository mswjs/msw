/**
 * @see https://github.com/mswjs/msw/issues/2714
 */
import { http, HttpResponse } from 'msw'
import { defineNetwork, expect } from '../../../setup/vitest-helpers'

const handlers = [
  http.get('/resource', () => {
    return HttpResponse.text('hello world')
  }),
]
const test = defineNetwork({ handlers })

test('handles requests after starting a stopped worker', async ({
  network,
  fetch,
  spyOnConsole,
}) => {
  if (!('start' in network)) {
    throw new Error('Expected a browser worker instance')
  }

  const consoleSpy = spyOnConsole()
  await network.stop()

  expect(consoleSpy.get('log')).toEqual(
    expect.arrayContaining(['[MSW] Mocking disabled.']),
  )

  await network.start()

  expect(consoleSpy.get('startGroupCollapsed')).toEqual(
    expect.arrayContaining(['[MSW] Mocking enabled.']),
  )

  const response = await fetch('/resource')
  expect.soft(response.status()).toBe(200)
  await expect(response.text()).resolves.toBe('hello world')
})

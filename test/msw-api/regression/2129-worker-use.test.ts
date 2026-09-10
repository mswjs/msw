import { http, HttpResponse } from 'msw'
/**
 * @see https://github.com/mswjs/msw/issues/2129
 */
import { defineNetwork, expect } from '../../setup/vitest-helpers'

const handlers = [
  http.get('*/v1/issues', () => {
    return HttpResponse.text('get-body')
  }),
  http.post('*/v1/issues', () => {
    return HttpResponse.text('post-body')
  }),
]

const test = defineNetwork({ handlers })

test('handles a stream response without throwing a timeout error', async ({
  fetch,
}) => {
  const getResponse = await fetch('/v1/issues')
  expect(await getResponse.text()).toBe('get-body')

  const postResponse = await fetch('/v1/issues', { method: 'POST' })
  expect(await postResponse.text()).toBe('post-body')
})

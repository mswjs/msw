import { http, HttpResponse } from 'msw'
import { defineNetwork, expect } from '../../../../setup/vitest-helpers'

const handlers = [
  http.get('*/json', () => {
    return HttpResponse.json({ firstName: 'John' })
  }),
  http.get('*/number', () => {
    return HttpResponse.json(123)
  }),
]

const test = defineNetwork({ handlers })

test('responds with a JSON response body', async ({ fetch }) => {
  const res = await fetch('/json')
  const headers = await res.allHeaders()
  const json = await res.json()

  expect(headers).toHaveProperty('content-type', 'application/json')
  expect(json).toEqual({ firstName: 'John' })
})

test('responds with a single number JSON response body', async ({ fetch }) => {
  const res = await fetch('/number')
  const headers = await res.allHeaders()
  const json = await res.json()

  expect(headers).toHaveProperty('content-type', 'application/json')
  expect(json).toEqual(123)
})

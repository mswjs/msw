import { http, HttpResponse } from 'msw'
import { defineTestNetwork, expect } from '../../../../setup/vitest-helpers'

const handlers = [
  http.get('*/json', () => {
    return HttpResponse.json({ firstName: 'John' })
  }),
  http.get('*/number', () => {
    return HttpResponse.json(123)
  }),
]

const test = defineTestNetwork({ handlers })

test('responds with a JSON response body', async ({ fetch }) => {
  const response = await fetch('/json')
  const headers = await response.allHeaders()
  const json = await response.json()

  expect(headers).toHaveProperty('content-type', 'application/json')
  expect(json).toEqual({ firstName: 'John' })
})

test('responds with a single number JSON response body', async ({ fetch }) => {
  const response = await fetch('/number')
  const headers = await response.allHeaders()
  const json = await response.json()

  expect(headers).toHaveProperty('content-type', 'application/json')
  expect(json).toEqual(123)
})

import { prepareResponse } from './prepareResponse'

test('parses a JSON response body given a "Content-Type:*/json" header', () => {
  const res = prepareResponse({
    status: 200,
    statusText: 'OK',
    headers: {
      'Content-Type': 'application/json',
    },
    body: `{"property":2}`,
    once: false,
    delay: 0,
  })

  // Preserves all the properties
  expect(res).toHaveProperty('status', 200)
  expect(res).toHaveProperty('statusText', 'OK')
  expect(res).toHaveProperty('headers', { 'Content-Type': 'application/json' })
  expect(res).toHaveProperty('once', false)
  expect(res).toHaveProperty('delay', 0)

  // Parses a JSON response body
  expect(res).toHaveProperty('body', { property: 2 })
})

test('returns a stringified valid JSON body given a non-JSON "Content-Type" header', () => {
  const res = prepareResponse({
    status: 200,
    statusText: 'OK',
    headers: {},
    body: `{"property":2}`,
    once: false,
    delay: 0,
  })

  expect(res).toHaveProperty('status', 200)
  expect(res).toHaveProperty('statusText', 'OK')
  expect(res).toHaveProperty('headers', {})
  expect(res).toHaveProperty('once', false)
  expect(res).toHaveProperty('delay', 0)

  // Returns a non-JSON response body as-is
  expect(res).toHaveProperty('body', `{"property":2}`)
})

test('returns a non-JSON response body as-is', () => {
  const res = prepareResponse({
    status: 200,
    statusText: 'OK',
    headers: {},
    body: `text-body`,
    once: false,
    delay: 0,
  })

  expect(res).toHaveProperty('status', 200)
  expect(res).toHaveProperty('statusText', 'OK')
  expect(res).toHaveProperty('headers', {})
  expect(res).toHaveProperty('once', false)
  expect(res).toHaveProperty('delay', 0)

  // Returns a non-JSON response body as-is
  expect(res).toHaveProperty('body', 'text-body')
})

import { prepareResponse } from './prepareResponse'

test('parses a JSON response body given a "Content-Type:*/json" header', () => {
  const res = prepareResponse({
    status: 200,
    statusText: 'OK',
    headers: {
      'Content-Type': 'application/json',
    },
    body: `{"property":2}`,
  })

  // Preserves all the properties
  expect(res.status).toEqual(200)
  expect(res.statusText).toEqual('OK')
  expect(res.headers).toEqual({ 'Content-Type': 'application/json' })

  // Parses a JSON response body
  expect(res.body).toEqual({ property: 2 })
})

test('returns a stringified valid JSON body given a non-JSON "Content-Type" header', () => {
  const res = prepareResponse({
    status: 200,
    statusText: 'OK',
    headers: {},
    body: `{"property":2}`,
  })

  expect(res.status).toEqual(200)
  expect(res.statusText).toEqual('OK')
  expect(res.headers).toEqual({})

  // Returns a non-JSON response body as-is
  expect(res.body).toEqual(`{"property":2}`)
})

test('returns a non-JSON response body as-is', () => {
  const res = prepareResponse({
    status: 200,
    statusText: 'OK',
    headers: {},
    body: `text-body`,
  })

  expect(res.status).toEqual(200)
  expect(res.statusText).toEqual('OK')
  expect(res.headers).toEqual({})

  // Returns a non-JSON response body as-is
  expect(res.body).toEqual('text-body')
})

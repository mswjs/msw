import { http, HttpHandler, HttpResponse } from './index'

test('exposes the http request handler namespace', () => {
  expect(Object.keys(http)).toEqual([
    'all',
    'head',
    'get',
    'post',
    'put',
    'delete',
    'patch',
    'options',
  ])
})

test('exposes the HttpHandler and HttpResponse classes', () => {
  expect(http.get('/resource', () => {})).toBeInstanceOf(HttpHandler)
  expect(HttpResponse.json({})).toBeInstanceOf(Response)
})

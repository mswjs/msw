import { rest } from './rest'

test('exports all REST API methods', () => {
  expect(rest).toBeDefined()
  expect(Object.keys(rest)).toEqual([
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

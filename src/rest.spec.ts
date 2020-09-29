import { rest } from './rest'

test('Exports all REST API methods', () => {
  expect(rest).not.toBeUndefined()
  expect(Object.keys(rest)).toEqual([
    'head',
    'get',
    'post',
    'put',
    'delete',
    'patch',
    'options',
    'link',
  ])
})
